export type RolSistema = "empleado" | "lider" | "gerente" | "rrhh";
export type ModalidadTipo = "presencial" | "remoto" | "hibrido";
export type MetodoRegistro = "wifi" | "home" | "manual";
export type AsistenciaTipo = "entrada" | "salida";
export type ObjetivoEstado = "pendiente" | "en_progreso" | "completado" | "cancelado";

export type Database = {
  public: {
    Tables: {
      owners: {
        Row: {
          id: string;
          user_id: string | null;
          nombre: string;
          email: string;
          holding_nombre: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          nombre: string;
          email: string;
          holding_nombre?: string | null;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          email?: string;
          holding_nombre?: string | null;
        };
        Relationships: [];
      };
      owner_empresas: {
        Row: {
          id: string;
          owner_id: string;
          empresa_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          empresa_id: string;
          created_at?: string;
        };
        Update: {};
        Relationships: [
          {
            foreignKeyName: "owner_empresas_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "owners";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "owner_empresas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
        ];
      };
      empresas: {
        Row: {
          id: string;
          nombre: string;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          plan?: string;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          plan?: string;
        };
        Relationships: [];
      };
      areas: {
        Row: {
          id: string;
          empresa_id: string;
          nombre: string;
          lider_id: string | null;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          nombre: string;
          lider_id?: string | null;
        };
        Update: {
          nombre?: string;
          lider_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "areas_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "areas_lider_id_fkey";
            columns: ["lider_id"];
            isOneToOne: false;
            referencedRelation: "empleados";
            referencedColumns: ["id"];
          },
        ];
      };
      empleados: {
        Row: {
          id: string;
          empresa_id: string;
          user_id: string | null;
          nombre: string;
          email: string;
          area_id: string | null;
          rol: RolSistema;
          modalidad: ModalidadTipo;
          horas_laborables: number;
          activo: boolean;
          es_demo: boolean;
          notif_preferencias: Record<string, boolean> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          user_id?: string | null;
          nombre: string;
          email: string;
          area_id?: string | null;
          rol?: RolSistema;
          modalidad?: ModalidadTipo;
          activo?: boolean;
          es_demo?: boolean;
          notif_preferencias?: Record<string, boolean> | null;
          created_at?: string;
        };
        Update: {
          nombre?: string;
          email?: string;
          area_id?: string | null;
          rol?: RolSistema;
          modalidad?: ModalidadTipo;
          activo?: boolean;
          es_demo?: boolean;
          notif_preferencias?: Record<string, boolean> | null;
        };
        Relationships: [
          {
            foreignKeyName: "empleados_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "empleados_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      objetivos: {
        Row: {
          id: string;
          empresa_id: string;
          empleado_id: string;
          asignado_por: string | null;
          titulo: string;
          descripcion: string | null;
          progreso: number;
          estado: ObjetivoEstado;
          vencimiento: string | null;
          categoria: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          empleado_id: string;
          asignado_por?: string | null;
          titulo: string;
          descripcion?: string | null;
          progreso?: number;
          estado?: ObjetivoEstado;
          vencimiento?: string | null;
          categoria?: string | null;
          created_at?: string;
        };
        Update: {
          titulo?: string;
          descripcion?: string | null;
          progreso?: number;
          estado?: ObjetivoEstado;
          vencimiento?: string | null;
          categoria?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objetivos_empresa_id_fkey";
            columns: ["empresa_id"];
            isOneToOne: false;
            referencedRelation: "empresas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "objetivos_empleado_id_fkey";
            columns: ["empleado_id"];
            isOneToOne: false;
            referencedRelation: "empleados";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "objetivos_asignado_por_fkey";
            columns: ["asignado_por"];
            isOneToOne: false;
            referencedRelation: "empleados";
            referencedColumns: ["id"];
          },
        ];
      };
      registros_asistencia: {
        Row: {
          id: string;
          empleado_id: string;
          tipo: AsistenciaTipo;
          fecha: string;
          hora_entrada: string | null;
          hora_salida: string | null;
          metodo: MetodoRegistro;
          created_at: string;
        };
        Insert: {
          id?: string;
          empleado_id: string;
          tipo: AsistenciaTipo;
          metodo: MetodoRegistro;
          fecha?: string;
          hora_entrada?: string | null;
          hora_salida?: string | null;
          created_at?: string;
        };
        Update: {
          tipo?: AsistenciaTipo;
          fecha?: string;
          hora_entrada?: string | null;
          hora_salida?: string | null;
          metodo?: MetodoRegistro;
        };
        Relationships: [
          {
            foreignKeyName: "registros_asistencia_empleado_id_fkey";
            columns: ["empleado_id"];
            isOneToOne: false;
            referencedRelation: "empleados";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      rol_sistema: RolSistema;
      modalidad_tipo: ModalidadTipo;
      metodo_registro: MetodoRegistro;
      asistencia_tipo: AsistenciaTipo;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
