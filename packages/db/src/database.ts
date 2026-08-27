export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      access_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["access_status"];
          gate_id: string;
          id: string;
          invitation_id: string | null;
          security_user_id: string;
          timestamp: string;
          vehicle_id: string | null;
        };
        Insert: {
          action_type: Database["public"]["Enums"]["access_status"];
          gate_id: string;
          id?: string;
          invitation_id?: string | null;
          security_user_id: string;
          timestamp?: string;
          vehicle_id?: string | null;
        };
        Update: {
          action_type?: Database["public"]["Enums"]["access_status"];
          gate_id?: string;
          id?: string;
          invitation_id?: string | null;
          security_user_id?: string;
          timestamp?: string;
          vehicle_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "access_logs_gate_id_fkey";
            columns: ["gate_id"];
            isOneToOne: false;
            referencedRelation: "gates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_security_user_id_fkey";
            columns: ["security_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "access_logs_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "invitation_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      complexes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      gates: {
        Row: {
          complex_id: string | null;
          id: string;
          name: string;
          neighborhood_id: string | null;
          type: Database["public"]["Enums"]["gate_type"];
        };
        Insert: {
          complex_id?: string | null;
          id?: string;
          name: string;
          neighborhood_id?: string | null;
          type: Database["public"]["Enums"]["gate_type"];
        };
        Update: {
          complex_id?: string | null;
          id?: string;
          name?: string;
          neighborhood_id?: string | null;
          type?: Database["public"]["Enums"]["gate_type"];
        };
        Relationships: [
          {
            foreignKeyName: "gates_complex_id_fkey";
            columns: ["complex_id"];
            isOneToOne: false;
            referencedRelation: "complexes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gates_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_passengers: {
        Row: {
          created_at: string;
          dni: string | null;
          full_name: string;
          id: string;
          invitation_id: string;
          is_driver: boolean;
          vehicle_id: string;
        };
        Insert: {
          created_at?: string;
          dni?: string | null;
          full_name: string;
          id?: string;
          invitation_id: string;
          is_driver?: boolean;
          vehicle_id: string;
        };
        Update: {
          created_at?: string;
          dni?: string | null;
          full_name?: string;
          id?: string;
          invitation_id?: string;
          is_driver?: boolean;
          vehicle_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_passengers_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitation_passengers_vehicle_id_fkey";
            columns: ["vehicle_id"];
            isOneToOne: false;
            referencedRelation: "invitation_vehicles";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_vehicles: {
        Row: {
          color: string | null;
          created_at: string;
          id: string;
          invitation_id: string;
          plate_display: string;
          plate_format: Database["public"]["Enums"]["plate_format"];
          plate_normalized: string;
        };
        Insert: {
          color?: string | null;
          created_at?: string;
          id?: string;
          invitation_id: string;
          plate_display: string;
          plate_format: Database["public"]["Enums"]["plate_format"];
          plate_normalized: string;
        };
        Update: {
          color?: string | null;
          created_at?: string;
          id?: string;
          invitation_id?: string;
          plate_display?: string;
          plate_format?: Database["public"]["Enums"]["plate_format"];
          plate_normalized?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_vehicles_invitation_id_fkey";
            columns: ["invitation_id"];
            isOneToOne: false;
            referencedRelation: "invitations";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          guest_dni: string | null;
          guest_name: string | null;
          id: string;
          is_revoked: boolean;
          is_single_use: boolean;
          neighborhood_id: string;
          property_id: string;
          qr_token: string | null;
          share_token: string;
          status: Database["public"]["Enums"]["invitation_lifecycle"];
          valid_from: string;
          valid_to: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          guest_dni?: string | null;
          guest_name?: string | null;
          id?: string;
          is_revoked?: boolean;
          is_single_use?: boolean;
          neighborhood_id: string;
          property_id: string;
          qr_token?: string | null;
          share_token?: string;
          status?: Database["public"]["Enums"]["invitation_lifecycle"];
          valid_from: string;
          valid_to: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          guest_dni?: string | null;
          guest_name?: string | null;
          id?: string;
          is_revoked?: boolean;
          is_single_use?: boolean;
          neighborhood_id?: string;
          property_id?: string;
          qr_token?: string | null;
          share_token?: string;
          status?: Database["public"]["Enums"]["invitation_lifecycle"];
          valid_from?: string;
          valid_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      neighborhoods: {
        Row: {
          complex_id: string | null;
          created_at: string;
          id: string;
          name: string;
          timezone: string;
        };
        Insert: {
          complex_id?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          timezone?: string;
        };
        Update: {
          complex_id?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "neighborhoods_complex_id_fkey";
            columns: ["complex_id"];
            isOneToOne: false;
            referencedRelation: "complexes";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          first_name: string;
          id: string;
          is_active: boolean;
          last_name: string;
        };
        Insert: {
          created_at?: string;
          first_name: string;
          id: string;
          is_active?: boolean;
          last_name: string;
        };
        Update: {
          created_at?: string;
          first_name?: string;
          id?: string;
          is_active?: boolean;
          last_name?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          block_name: string | null;
          created_at: string;
          id: string;
          lot_number: string;
          neighborhood_id: string;
          notes: string | null;
          phone: string | null;
          street_name: string | null;
        };
        Insert: {
          block_name?: string | null;
          created_at?: string;
          id?: string;
          lot_number: string;
          neighborhood_id: string;
          notes?: string | null;
          phone?: string | null;
          street_name?: string | null;
        };
        Update: {
          block_name?: string | null;
          created_at?: string;
          id?: string;
          lot_number?: string;
          neighborhood_id?: string;
          notes?: string | null;
          phone?: string | null;
          street_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "properties_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
        ];
      };
      shifts: {
        Row: {
          ended_at: string | null;
          gate_id: string;
          id: string;
          started_at: string;
          user_id: string;
        };
        Insert: {
          ended_at?: string | null;
          gate_id: string;
          id?: string;
          started_at?: string;
          user_id: string;
        };
        Update: {
          ended_at?: string | null;
          gate_id?: string;
          id?: string;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_gate_id_fkey";
            columns: ["gate_id"];
            isOneToOne: false;
            referencedRelation: "gates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          complex_id: string | null;
          id: string;
          neighborhood_id: string | null;
          property_id: string | null;
          role: Database["public"]["Enums"]["role"];
          user_id: string;
        };
        Insert: {
          complex_id?: string | null;
          id?: string;
          neighborhood_id?: string | null;
          property_id?: string | null;
          role: Database["public"]["Enums"]["role"];
          user_id: string;
        };
        Update: {
          complex_id?: string | null;
          id?: string;
          neighborhood_id?: string | null;
          property_id?: string | null;
          role?: Database["public"]["Enums"]["role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_complex_id_fkey";
            columns: ["complex_id"];
            isOneToOne: false;
            referencedRelation: "complexes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_neighborhood_id_fkey";
            columns: ["neighborhood_id"];
            isOneToOne: false;
            referencedRelation: "neighborhoods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      active_shift_gate_ids: { Args: never; Returns: string[] };
      claim_invite: {
        Args: {
          p_guest_dni: string | null;
          p_guest_name: string;
          p_share: string;
          p_vehicles: Json;
        };
        Returns: {
          guest_name: string;
          qr_token: string;
        }[];
      };
      is_superadmin: { Args: never; Returns: boolean };
      managed_complex_ids: { Args: never; Returns: string[] };
      managed_neighborhood_ids: { Args: never; Returns: string[] };
      owned_property_ids: { Args: never; Returns: string[] };
      preview_invite: {
        Args: { p_share: string };
        Returns: {
          guest_name: string | null;
          is_revoked: boolean;
          lot_number: string;
          neighborhood_name: string;
          qr_token: string | null;
          status: Database["public"]["Enums"]["invitation_lifecycle"];
          street_name: string | null;
          valid_from: string;
          valid_to: string;
        }[];
      };
      security_visible_complex_ids: { Args: never; Returns: string[] };
      security_visible_neighborhood_ids: { Args: never; Returns: string[] };
    };
    Enums: {
      access_status:
        | "PENDING"
        | "IN_COMPLEX"
        | "IN_PROPERTY"
        | "EXITED"
        | "EXPIRED";
      gate_type: "MAIN_COMPLEX" | "INTERNAL_NEIGHBORHOOD";
      invitation_lifecycle: "DRAFT" | "READY";
      plate_format: "AR_OLD" | "AR_MERCOSUR";
      role:
        | "SUPERADMIN"
        | "COMPLEX_ADMIN"
        | "NEIGHBORHOOD_ADMIN"
        | "SECURITY"
        | "OWNER";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      access_status: [
        "PENDING",
        "IN_COMPLEX",
        "IN_PROPERTY",
        "EXITED",
        "EXPIRED",
      ],
      gate_type: ["MAIN_COMPLEX", "INTERNAL_NEIGHBORHOOD"],
      invitation_lifecycle: ["DRAFT", "READY"],
      plate_format: ["AR_OLD", "AR_MERCOSUR"],
      role: [
        "SUPERADMIN",
        "COMPLEX_ADMIN",
        "NEIGHBORHOOD_ADMIN",
        "SECURITY",
        "OWNER",
      ],
    },
  },
} as const;
