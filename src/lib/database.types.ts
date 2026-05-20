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
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          message: string
          name: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          message: string
          name: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          message?: string
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          created_at: string
          handle: string | null
          id: string
          is_onboarded: boolean
          nickname: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          handle?: string | null
          id: string
          is_onboarded?: boolean
          nickname?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          created_at?: string
          handle?: string | null
          id?: string
          is_onboarded?: boolean
          nickname?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      project_images: {
        Row: {
          author_id: string
          available_sizes: string[] | null
          created_at: string | null
          id: string
          project_id: string
          published_ext: string | null
          source_ext: string
          status: Database["public"]["Enums"]["status"]
          updated_at: string | null
          uploaded_at: string | null
        }
        Insert: {
          author_id: string
          available_sizes?: string[] | null
          created_at?: string | null
          id?: string
          project_id: string
          published_ext?: string | null
          source_ext: string
          status?: Database["public"]["Enums"]["status"]
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Update: {
          author_id?: string
          available_sizes?: string[] | null
          created_at?: string | null
          id?: string
          project_id?: string
          published_ext?: string | null
          source_ext?: string
          status?: Database["public"]["Enums"]["status"]
          updated_at?: string | null
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_likes: {
        Row: {
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_likes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          author_handle: string
          author_id: string
          category_main: number
          category_sub: number[] | null
          comment_count: number
          content: string | null
          cover_image_id: string | null
          created_at: string
          description: string | null
          first_published_at: string | null
          id: string
          is_exhibition: boolean
          is_official: boolean
          keywords: string[] | null
          like_count: number
          links: Json | null
          poster_url: string | null
          slug: string
          status: Database["public"]["Enums"]["status"]
          subtitle: string | null
          tech_stack: string[] | null
          title: string
          updated_at: string | null
          year: number
        }
        Insert: {
          author_handle: string
          author_id: string
          category_main: number
          category_sub?: number[] | null
          comment_count?: number
          content?: string | null
          cover_image_id?: string | null
          created_at?: string
          description?: string | null
          first_published_at?: string | null
          id?: string
          is_exhibition?: boolean
          is_official?: boolean
          keywords?: string[] | null
          like_count?: number
          links?: Json | null
          poster_url?: string | null
          slug: string
          status?: Database["public"]["Enums"]["status"]
          subtitle?: string | null
          tech_stack?: string[] | null
          title: string
          updated_at?: string | null
          year?: number
        }
        Update: {
          author_handle?: string
          author_id?: string
          category_main?: number
          category_sub?: number[] | null
          comment_count?: number
          content?: string | null
          cover_image_id?: string | null
          created_at?: string
          description?: string | null
          first_published_at?: string | null
          id?: string
          is_exhibition?: boolean
          is_official?: boolean
          keywords?: string[] | null
          like_count?: number
          links?: Json | null
          poster_url?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["status"]
          subtitle?: string | null
          tech_stack?: string[] | null
          title?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_cover_image_id_fkey"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "project_images"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          age_group: string | null
          created_at: string
          exhibition_plan: string | null
          gender: string | null
          id: string
          ip_hash: string | null
          referral_source: string | null
          user_id: string | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          exhibition_plan?: string | null
          gender?: string | null
          id?: string
          ip_hash?: string | null
          referral_source?: string | null
          user_id?: string | null
        }
        Update: {
          age_group?: string | null
          created_at?: string
          exhibition_plan?: string | null
          gender?: string | null
          id?: string
          ip_hash?: string | null
          referral_source?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_comments: {
        Row: {
          author_avatar_url: string | null
          author_handle: string | null
          author_nickname: string | null
          content: string | null
          created_at: string | null
          id: string | null
          project_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_array_element_length: {
        Args: { arr: string[]; max_length: number }
        Returns: boolean
      }
    }
    Enums: {
      status: "draft" | "published" | "processing"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      status: ["draft", "published", "processing"],
    },
  },
} as const

