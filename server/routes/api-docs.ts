/**
 * API Documentation Routes
 * 
 * Serves Swagger UI for interactive API documentation
 */

import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// Load OpenAPI specification
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openapiPath = path.join(__dirname, '../../docs/api/openapi.yaml');

let swaggerDocument: any;
try {
  swaggerDocument = YAML.load(openapiPath);
} catch (error) {
  console.error('Failed to load OpenAPI specification:', error);
  swaggerDocument = {
    openapi: '3.0.3',
    info: {
      title: 'LinguaMaster API',
      version: '1.0.0',
      description: 'API documentation is currently unavailable',
    },
    paths: {},
  };
}

// Swagger UI options
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0 }
    .swagger-ui .scheme-container { margin: 20px 0 }
  `,
  customSiteTitle: 'LinguaMaster API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    syntaxHighlight: {
      activate: true,
      theme: 'monokai',
    },
  },
};

// Serve Swagger UI
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Serve raw OpenAPI spec
router.get('/docs/openapi.yaml', (_req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(openapiPath);
});

router.get('/docs/openapi.json', (_req, res) => {
  res.json(swaggerDocument);
});

// API documentation landing page
router.get('/docs/info', (_req, res) => {
  res.json({
    title: 'LinguaMaster API Documentation',
    version: swaggerDocument.info.version,
    description: swaggerDocument.info.description,
    endpoints: {
      interactive: '/api/docs',
      openapi_yaml: '/api/docs/openapi.yaml',
      openapi_json: '/api/docs/openapi.json',
    },
    authentication: {
      type: 'Session-based with JWT',
      description: 'Most endpoints require authentication. Include session cookie in requests.',
    },
    rateLimits: {
      unauthenticated: '100 requests per 15 minutes per IP',
      authenticated: '1000 requests per 15 minutes per user',
      ai_endpoints: '50 requests per hour per user',
    },
    support: {
      email: 'support@linguamaster.ai',
      documentation: 'https://linguamaster.ai/docs',
    },
  });
});

export default router;
