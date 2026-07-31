import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Inventory & Supply Chain Management API',
      version: '1.0.0',
      description:
        'Phase 1: platform security, authentication/RBAC, and live inventory core (categories, items, ROP/EOQ). ' +
        'Phase 2: suppliers & procurement (catalogue, performance scoring, greedy supplier selection), the ' +
        'purchase order lifecycle (two-level approval, GRN with discrepancy handling), alerts, and the Greedy ' +
        'vs Proportional budget allocation comparison - for the UWS MSc Inventory & Supply Chain project.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', nullable: true },
            message: { type: 'string' },
            meta: { type: 'object', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);
