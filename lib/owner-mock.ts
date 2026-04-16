export const MOCK_EMPRESAS = [
  { id: "mock-1", nombre: "TechCorp SA", plan: "business" },
  { id: "mock-2", nombre: "Distribuidora Norte", plan: "business" },
  { id: "mock-3", nombre: "Inversiones del Sur", plan: "business" },
] as const;

export const MOCK_IDS = new Set(["mock-1", "mock-2", "mock-3"]);

export const MOCK_STATS = [
  {
    id: "mock-1", nombre: "TechCorp SA",
    total: 128, presentes: 98, homeHoy: 24, ausentes: 30, asistPct: 77,
    objTotal: 18, objPct: 68, alertas: 3,
  },
  {
    id: "mock-2", nombre: "Distribuidora Norte",
    total: 245, presentes: 201, homeHoy: 45, ausentes: 44, asistPct: 82,
    objTotal: 26, objPct: 52, alertas: 5,
  },
  {
    id: "mock-3", nombre: "Inversiones del Sur",
    total: 67, presentes: 59, homeHoy: 12, ausentes: 8, asistPct: 88,
    objTotal: 12, objPct: 75, alertas: 2,
  },
];

export const MOCK_DETAIL: Record<string, {
  nombre: string;
  total: number; presentes: number; homeHoy: number; ausentes: number; asistPct: number;
  objPct: number;
  objPorArea: { id: string; nombre: string; completados: number; total: number; pct: number }[];
  gerente: { nombre: string } | null;
  lideres: { id: string; nombre: string; areaNombre: string; empCount: number }[];
  ausentesHoy: { id: string; nombre: string; areaNombre: string }[];
  objPendientes: number;
}> = {
  "mock-1": {
    nombre: "TechCorp SA",
    total: 128, presentes: 98, homeHoy: 24, ausentes: 30, asistPct: 77,
    objPct: 68,
    objPorArea: [
      { id: "a1", nombre: "Producto",     completados: 5, total: 7, pct: 71 },
      { id: "a2", nombre: "Ingeniería",   completados: 3, total: 5, pct: 60 },
      { id: "a3", nombre: "Marketing",    completados: 4, total: 6, pct: 67 },
    ],
    gerente: { nombre: "Laura Méndez" },
    lideres: [
      { id: "l1", nombre: "Carlos Ruiz",     areaNombre: "Producto",   empCount: 18 },
      { id: "l2", nombre: "Ana Torres",      areaNombre: "Ingeniería", empCount: 32 },
      { id: "l3", nombre: "Martín Gil",      areaNombre: "Marketing",  empCount: 12 },
    ],
    ausentesHoy: [
      { id: "e1", nombre: "Pablo Sosa",         areaNombre: "Ingeniería" },
      { id: "e2", nombre: "Valentina Cruz",      areaNombre: "Producto" },
      { id: "e3", nombre: "Diego Fernández",     areaNombre: "Marketing" },
    ],
    objPendientes: 4,
  },
  "mock-2": {
    nombre: "Distribuidora Norte",
    total: 245, presentes: 201, homeHoy: 45, ausentes: 44, asistPct: 82,
    objPct: 52,
    objPorArea: [
      { id: "b1", nombre: "Logística",      completados: 3, total: 6, pct: 50 },
      { id: "b2", nombre: "Ventas",         completados: 4, total: 8, pct: 50 },
      { id: "b3", nombre: "Administración", completados: 5, total: 7, pct: 71 },
      { id: "b4", nombre: "Distribución",   completados: 2, total: 5, pct: 40 },
    ],
    gerente: { nombre: "Roberto Sánchez" },
    lideres: [
      { id: "l4", nombre: "María Pérez",     areaNombre: "Logística",      empCount: 45 },
      { id: "l5", nombre: "Jorge Acosta",    areaNombre: "Ventas",         empCount: 78 },
      { id: "l6", nombre: "Claudia Vega",    areaNombre: "Administración", empCount: 22 },
      { id: "l7", nombre: "Sebastián Ríos",  areaNombre: "Distribución",   empCount: 60 },
    ],
    ausentesHoy: [
      { id: "e4", nombre: "Lucía Gómez",       areaNombre: "Ventas" },
      { id: "e5", nombre: "Hernán Castro",      areaNombre: "Logística" },
      { id: "e6", nombre: "Patricia López",     areaNombre: "Distribución" },
      { id: "e7", nombre: "Nicolás Díaz",       areaNombre: "Ventas" },
      { id: "e8", nombre: "Alejandra Suárez",   areaNombre: "Administración" },
    ],
    objPendientes: 7,
  },
  "mock-3": {
    nombre: "Inversiones del Sur",
    total: 67, presentes: 59, homeHoy: 12, ausentes: 8, asistPct: 88,
    objPct: 75,
    objPorArea: [
      { id: "c1", nombre: "Finanzas",    completados: 4, total: 5, pct: 80 },
      { id: "c2", nombre: "Legal",       completados: 2, total: 3, pct: 67 },
      { id: "c3", nombre: "Inversiones", completados: 3, total: 4, pct: 75 },
    ],
    gerente: { nombre: "Florencia Medina" },
    lideres: [
      { id: "l8", nombre: "Gustavo Ibarra",  areaNombre: "Finanzas",    empCount: 14 },
      { id: "l9", nombre: "Natalia Ortiz",   areaNombre: "Legal",       empCount: 8 },
      { id: "l10", nombre: "Emilio Castillo", areaNombre: "Inversiones", empCount: 20 },
    ],
    ausentesHoy: [
      { id: "e9",  nombre: "Ramiro Aguilar", areaNombre: "Finanzas" },
      { id: "e10", nombre: "Sofía Herrera",  areaNombre: "Inversiones" },
    ],
    objPendientes: 2,
  },
};
