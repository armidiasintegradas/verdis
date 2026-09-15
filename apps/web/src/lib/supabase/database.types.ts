export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          id: string
          new_state: Json | null
          occurred_at: string
          organization_id: string | null
          previous_state: Json | null
          subject_id: string
          subject_type: string
          technical_context: Json
          tenant_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          id?: string
          new_state?: Json | null
          occurred_at?: string
          organization_id?: string | null
          previous_state?: Json | null
          subject_id: string
          subject_type: string
          technical_context?: Json
          tenant_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          id?: string
          new_state?: Json | null
          occurred_at?: string
          organization_id?: string | null
          previous_state?: Json | null
          subject_id?: string
          subject_type?: string
          technical_context?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      counterparties: {
        Row: {
          created_at: string
          external_name: string | null
          external_tax_id: string | null
          id: string
          linked_organization_id: string | null
          organization_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          external_name?: string | null
          external_tax_id?: string | null
          id?: string
          linked_organization_id?: string | null
          organization_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          external_name?: string | null
          external_tax_id?: string | null
          id?: string
          linked_organization_id?: string | null
          organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counterparties_linked_organization_id_fkey"
            columns: ["linked_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counterparties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extractions: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          extracted_fields: Json
          id: string
          model_name: string
          model_version: string | null
          provider: string
          raw_result: Json | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          extracted_fields?: Json
          id?: string
          model_name: string
          model_version?: string | null
          provider: string
          raw_result?: Json | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          extracted_fields?: Json
          id?: string
          model_name?: string
          model_version?: string | null
          provider?: string
          raw_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          document_type: string
          external_key: string | null
          external_number: string | null
          extraction_status: Database["public"]["Enums"]["review_status"]
          id: string
          mime_type: string
          organization_id: string
          original_filename: string
          sha256: string
          storage_bucket: string
          storage_path: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          document_type: string
          external_key?: string | null
          external_number?: string | null
          extraction_status?: Database["public"]["Enums"]["review_status"]
          id?: string
          mime_type: string
          organization_id: string
          original_filename: string
          sha256: string
          storage_bucket: string
          storage_path: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          document_type?: string
          external_key?: string | null
          external_number?: string | null
          extraction_status?: Database["public"]["Enums"]["review_status"]
          id?: string
          mime_type?: string
          organization_id?: string
          original_filename?: string
          sha256?: string
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      evidences: {
        Row: {
          claimed_fields: Json
          confidence: number | null
          created_at: string
          created_by: string
          document_id: string | null
          evidence_type: string
          extracted_fields: Json
          id: string
          movement_id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          claimed_fields?: Json
          confidence?: number | null
          created_at?: string
          created_by: string
          document_id?: string | null
          evidence_type: string
          extracted_fields?: Json
          id?: string
          movement_id: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          claimed_fields?: Json
          confidence?: number | null
          created_at?: string
          created_by?: string
          document_id?: string | null
          evidence_type?: string
          extracted_fields?: Json
          id?: string
          movement_id?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "evidences_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidences_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      material_aliases: {
        Row: {
          alias: string
          created_at: string
          id: string
          material_id: string
          tenant_id: string
        }
        Insert: {
          alias: string
          created_at?: string
          id?: string
          material_id: string
          tenant_id: string
        }
        Update: {
          alias?: string
          created_at?: string
          id?: string
          material_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_aliases_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_aliases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          category: string
          code: string
          created_at: string
          default_unit: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          created_at?: string
          default_unit?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          created_at?: string
          default_unit?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          organization_id: string
          role_id: string
          starts_at: string
          status: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          organization_id: string
          role_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          organization_id?: string
          role_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      movements: {
        Row: {
          adjustment_reason: string | null
          created_at: string
          created_by: string
          destination_counterparty_id: string | null
          destination_organization_id: string | null
          destination_unit_id: string | null
          evidence_level: Database["public"]["Enums"]["evidence_level"]
          id: string
          material_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          occurred_at: string
          organization_id: string
          quantity_kg: number
          source_counterparty_id: string | null
          source_organization_id: string | null
          source_unit_id: string | null
          status: Database["public"]["Enums"]["movement_status"]
          tenant_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          adjustment_reason?: string | null
          created_at?: string
          created_by: string
          destination_counterparty_id?: string | null
          destination_organization_id?: string | null
          destination_unit_id?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          id?: string
          material_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          occurred_at: string
          organization_id: string
          quantity_kg: number
          source_counterparty_id?: string | null
          source_organization_id?: string | null
          source_unit_id?: string | null
          status?: Database["public"]["Enums"]["movement_status"]
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_reason?: string | null
          created_at?: string
          created_by?: string
          destination_counterparty_id?: string | null
          destination_organization_id?: string | null
          destination_unit_id?: string | null
          evidence_level?: Database["public"]["Enums"]["evidence_level"]
          id?: string
          material_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          occurred_at?: string
          organization_id?: string
          quantity_kg?: number
          source_counterparty_id?: string | null
          source_organization_id?: string | null
          source_unit_id?: string | null
          status?: Database["public"]["Enums"]["movement_status"]
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "movements_destination_counterparty_id_fkey"
            columns: ["destination_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_destination_organization_id_fkey"
            columns: ["destination_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_destination_unit_id_fkey"
            columns: ["destination_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_source_counterparty_id_fkey"
            columns: ["source_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_source_organization_id_fkey"
            columns: ["source_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_source_unit_id_fkey"
            columns: ["source_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movements_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          display_name: string
          id: string
          legal_name: string
          tax_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          legal_name: string
          tax_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          legal_name?: string
          tax_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      reconciliations: {
        Row: {
          created_at: string
          id: string
          left_movement_id: string
          match_score: number | null
          quantity_difference_kg: number
          reviewed_by: string | null
          right_movement_id: string
          status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          left_movement_id: string
          match_score?: number | null
          quantity_difference_kg: number
          reviewed_by?: string | null
          right_movement_id: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          created_at?: string
          id?: string
          left_movement_id?: string
          match_score?: number | null
          quantity_difference_kg?: number
          reviewed_by?: string | null
          right_movement_id?: string
          status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reconciliations_left_movement_id_fkey"
            columns: ["left_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliations_right_movement_id_fkey"
            columns: ["right_movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_id: string
        }
        Insert: {
          permission_code: string
          role_id: string
        }
        Update: {
          permission_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          built_in: boolean
          code: string
          id: string
          name: string
          scope_kind: string
        }
        Insert: {
          built_in?: boolean
          code: string
          id?: string
          name: string
          scope_kind: string
        }
        Update: {
          built_in?: boolean
          code?: string
          id?: string
          name?: string
          scope_kind?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          buyer_counterparty_id: string
          created_at: string
          fiscal_document_id: string | null
          id: string
          material_id: string
          movement_id: string
          organization_id: string
          quantity_kg: number
          sold_at: string
          tenant_id: string
          total_amount: number | null
          unit_id: string | null
          unit_price: number
        }
        Insert: {
          buyer_counterparty_id: string
          created_at?: string
          fiscal_document_id?: string | null
          id?: string
          material_id: string
          movement_id: string
          organization_id: string
          quantity_kg: number
          sold_at: string
          tenant_id: string
          total_amount?: number | null
          unit_id?: string | null
          unit_price: number
        }
        Update: {
          buyer_counterparty_id?: string
          created_at?: string
          fiscal_document_id?: string | null
          id?: string
          material_id?: string
          movement_id?: string
          organization_id?: string
          quantity_kg?: number
          sold_at?: string
          tenant_id?: string
          total_amount?: number | null
          unit_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_counterparty_id_fkey"
            columns: ["buyer_counterparty_id"]
            isOneToOne: false
            referencedRelation: "counterparties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_fiscal_document_id_fkey"
            columns: ["fiscal_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: true
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger_entries: {
        Row: {
          created_at: string
          delta_kg: number
          effect_kind: string
          id: string
          material_id: string
          movement_id: string
          occurred_at: string
          organization_id: string
          tenant_id: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          delta_kg: number
          effect_kind: string
          id?: string
          material_id: string
          movement_id: string
          occurred_at: string
          organization_id: string
          tenant_id: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          delta_kg?: number
          effect_kind?: string
          id?: string
          material_id?: string
          movement_id?: string
          occurred_at?: string
          organization_id?: string
          tenant_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_snapshots: {
        Row: {
          counted_at: string
          created_at: string
          created_by: string
          id: string
          material_id: string
          organization_id: string
          quantity_kg: number
          snapshot_type: string
          tenant_id: string
          unit_id: string | null
        }
        Insert: {
          counted_at: string
          created_at?: string
          created_by: string
          id?: string
          material_id: string
          organization_id: string
          quantity_kg: number
          snapshot_type: string
          tenant_id: string
          unit_id?: string | null
        }
        Update: {
          counted_at?: string
          created_at?: string
          created_by?: string
          id?: string
          material_id?: string
          organization_id?: string
          quantity_kg?: number
          snapshot_type?: string
          tenant_id?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_snapshots_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_snapshots_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
        }
        Relationships: []
      }
      units: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
          tenant_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          tenant_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      validations: {
        Row: {
          actor_user_id: string | null
          automated: boolean
          created_at: string
          document_id: string | null
          evidence_id: string | null
          id: string
          movement_id: string | null
          reason: string | null
          rule_code: string
          status: Database["public"]["Enums"]["review_status"]
          validation_type: string
        }
        Insert: {
          actor_user_id?: string | null
          automated?: boolean
          created_at?: string
          document_id?: string | null
          evidence_id?: string | null
          id?: string
          movement_id?: string | null
          reason?: string | null
          rule_code: string
          status: Database["public"]["Enums"]["review_status"]
          validation_type: string
        }
        Update: {
          actor_user_id?: string | null
          automated?: boolean
          created_at?: string
          document_id?: string | null
          evidence_id?: string | null
          id?: string
          movement_id?: string | null
          reason?: string | null
          rule_code?: string
          status?: Database["public"]["Enums"]["review_status"]
          validation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "validations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "validations_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
        ]
      }
      weighings: {
        Row: {
          created_at: string
          declared_weight_kg: number | null
          gross_weight_kg: number
          id: string
          movement_id: string
          net_weight_kg: number | null
          scale_name: string | null
          source_document_id: string | null
          tare_weight_kg: number
          vehicle_plate: string | null
          weighed_at: string
        }
        Insert: {
          created_at?: string
          declared_weight_kg?: number | null
          gross_weight_kg: number
          id?: string
          movement_id: string
          net_weight_kg?: number | null
          scale_name?: string | null
          source_document_id?: string | null
          tare_weight_kg: number
          vehicle_plate?: string | null
          weighed_at: string
        }
        Update: {
          created_at?: string
          declared_weight_kg?: number | null
          gross_weight_kg?: number
          id?: string
          movement_id?: string
          net_weight_kg?: number | null
          scale_name?: string | null
          source_document_id?: string | null
          tare_weight_kg?: number
          vehicle_plate?: string | null
          weighed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weighings_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weighings_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_stock: {
        Row: {
          material_id: string | null
          organization_id: string | null
          quantity_kg: number | null
          tenant_id: string | null
          unit_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_ledger_entries_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_entries_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      evidence_level:
        | "AUTODECLARED"
        | "EVIDENCED"
        | "DOCUMENT_VERIFIED"
        | "VALIDATED"
        | "RECONCILED"
        | "TRACEABILITY_PROVEN"
        | "AUDITED"
      membership_status: "active" | "invited" | "suspended" | "ended"
      movement_status: "draft" | "posted" | "voided"
      movement_type:
        | "receipt"
        | "inbound"
        | "outbound"
        | "collection"
        | "transfer"
        | "sorting"
        | "sale"
        | "destination"
        | "reject"
        | "adjustment"
      review_status: "pending" | "accepted" | "rejected" | "needs_review"
      tenant_status: "active" | "suspended" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      evidence_level: [
        "AUTODECLARED",
        "EVIDENCED",
        "DOCUMENT_VERIFIED",
        "VALIDATED",
        "RECONCILED",
        "TRACEABILITY_PROVEN",
        "AUDITED",
      ],
      membership_status: ["active", "invited", "suspended", "ended"],
      movement_status: ["draft", "posted", "voided"],
      movement_type: [
        "receipt",
        "inbound",
        "outbound",
        "collection",
        "transfer",
        "sorting",
        "sale",
        "destination",
        "reject",
        "adjustment",
      ],
      review_status: ["pending", "accepted", "rejected", "needs_review"],
      tenant_status: ["active", "suspended", "archived"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

