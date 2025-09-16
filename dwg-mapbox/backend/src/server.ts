import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 4000;

const upload = multer({ dest: path.join(process.cwd(), 'uploads') });

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

// Convert DWG -> DXF using libredwg's dwg2dxf (must be installed), then DXF -> GeoJSON using dxf-parser
app.post('/convert', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const uploadedPath = req.file.path;
    const base = path.parse(uploadedPath).name;
    const dxfPath = path.join(path.dirname(uploadedPath), `${base}.dxf`);

    // 1) Use dwg2dxf; relies on system tool, no custom parsing
    await runCommand('dwg2dxf', [uploadedPath, dxfPath]);

    // 2) Parse DXF with dxf-parser to GeoJSON-like features
    const { default: DxfParser } = await import('dxf-parser');
    const dxfText = await fs.readFile(dxfPath, 'utf8');
    const parser = new (DxfParser as any)();
    const dxf = parser.parseSync(dxfText);

    // Convert basic entities to GeoJSON FeatureCollection (lines, polylines, lwpolylines, circles, arcs)
    const features: any[] = [];
    const pushFeature = (geom: any, props: any) => {
      features.push({ type: 'Feature', geometry: geom, properties: props });
    };

    const toPos = (p: any) => [p.x, p.y];

    const entities: any[] = dxf.entities || [];
    for (const e of entities) {
      switch (e.type) {
        case 'LINE':
          pushFeature({ type: 'LineString', coordinates: [toPos(e.start), toPos(e.end)] }, { layer: e.layer });
          break;
        case 'LWPOLYLINE':
        case 'POLYLINE':
          if (Array.isArray(e.vertices)) {
            const coords = e.vertices.map((v: any) => [v.x, v.y]);
            pushFeature({ type: 'LineString', coordinates: coords }, { layer: e.layer, closed: e.shape });
          }
          break;
        case 'CIRCLE':
          // approximate circle with 64 points
          const points: any[] = [];
          const segments = 64;
          for (let i = 0; i <= segments; i++) {
            const a = (i / segments) * Math.PI * 2;
            points.push([e.center.x + e.radius * Math.cos(a), e.center.y + e.radius * Math.sin(a)]);
          }
          pushFeature({ type: 'Polygon', coordinates: [points] }, { layer: e.layer });
          break;
        case 'ARC':
          const arcPoints: any[] = [];
          const arcSegments = 64;
          const start = (e.startAngle * Math.PI) / 180;
          const end = (e.endAngle * Math.PI) / 180;
          for (let i = 0; i <= arcSegments; i++) {
            const t = i / arcSegments;
            const a = start + (end - start) * t;
            arcPoints.push([e.center.x + e.radius * Math.cos(a), e.center.y + e.radius * Math.sin(a)]);
          }
          pushFeature({ type: 'LineString', coordinates: arcPoints }, { layer: e.layer });
          break;
        default:
          // Skip other entity types for now to preserve no-loss policy as much as libraries allow
          break;
      }
    }

    const featureCollection = { type: 'FeatureCollection', features };
    res.json(featureCollection);
  } catch (err: any) {
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on :${port}`);
});

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

