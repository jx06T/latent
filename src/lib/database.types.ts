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
      game_puzzles: {
        Row: {
          correct_answer: string
          created_at: string | null
          id: number
          message: string | null
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          id: number
          message?: string | null
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          id?: number
          message?: string | null
        }
        Relationships: []
      }
      game_submissions: {
        Row: {
          id: number
          input_text: string
          is_correct: boolean
          matched_puzzle: number | null
          submitted_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          id?: number
          input_text: string
          is_correct: boolean
          matched_puzzle?: number | null
          submitted_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          id?: number
          input_text?: string
          is_correct?: boolean
          matched_puzzle?: number | null
          submitted_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_submissions_matched_puzzle_fkey"
            columns: ["matched_puzzle"]
            isOneToOne: false
            referencedRelation: "game_puzzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_team_info"
            referencedColumns: ["id"]
          },
        ]
      }
      game_team_members: {
        Row: {
          is_first: boolean | null
          joined_at: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          is_first?: boolean | null
          joined_at?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          is_first?: boolean | null
          joined_at?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_team_info"
            referencedColumns: ["id"]
          },
        ]
      }
      game_team_progress: {
        Row: {
          puzzle_id: number
          solved_at: string | null
          solved_by: string
          team_id: string
        }
        Insert: {
          puzzle_id: number
          solved_at?: string | null
          solved_by: string
          team_id: string
        }
        Update: {
          puzzle_id?: number
          solved_at?: string | null
          solved_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_team_progress_puzzle_id_fkey"
            columns: ["puzzle_id"]
            isOneToOne: false
            referencedRelation: "game_puzzles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_team_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "game_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_team_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "public_team_info"
            referencedColumns: ["id"]
          },
        ]
      }
      game_teams: {
        Row: {
          activated_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_suspended: boolean | null
          max_members: number | null
          team_code: string
          team_name: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          max_members?: number | null
          team_code: string
          team_name?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          max_members?: number | null
          team_code?: string
          team_name?: string | null
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
      stats: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value?: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
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
      public_team_info: {
        Row: {
          id: string | null
          is_active: boolean | null
          max_members: number | null
          team_name: string | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          max_members?: number | null
          team_name?: string | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          max_members?: number | null
          team_name?: string | null
        }
        Relationships: []
      }
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
      get_user_team_id: { Args: never; Returns: string }
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

