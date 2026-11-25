
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "destinations": {
                  Row: {
                    "arrive_by": string,"id": number,"label": string | null,"lat": number,"lon": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arrive_by"?: string,"id"?: never,"label"?: string | null,"lat": number,"lon": number,"user_id": string
                  }
                  Update: {
                    "arrive_by"?: string,"id"?: never,"label"?: string | null,"lat"?: number,"lon"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"fb_posts": {
                  Row: {
                    "extracted": Json | null,"extractor_version": number | null,"group_name": string | null,"is_offer": boolean | null,"listing_id": number | null,"post_id": string,"posted_at": string | null,"text": string,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "extracted"?: Json | null,"extractor_version"?: number | null,"group_name"?: string | null,"is_offer"?: boolean | null,"listing_id"?: number | null,"post_id": string,"posted_at"?: string | null,"text": string,"url": string
                  }
                  Update: {
                    "extracted"?: Json | null,"extractor_version"?: number | null,"group_name"?: string | null,"is_offer"?: boolean | null,"listing_id"?: number | null,"post_id"?: string,"posted_at"?: string | null,"text"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fb_posts_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "active_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fb_posts_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fb_posts_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings_karlaplan"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_changes": {
                  Row: {
                    "field": string,"listing_id": number,"new": string | null,"old": string | null,"seen_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "field": string,"listing_id": number,"new"?: string | null,"old"?: string | null,"seen_at": string
                  }
                  Update: {
                    "field"?: string,"listing_id"?: number,"new"?: string | null,"old"?: string | null,"seen_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_changes_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "active_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_changes_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_changes_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings_karlaplan"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "area": string | null,"content_hash": string,"end_date": string | null,"first_hand": boolean | null,"first_seen": string,"flags": (string)[],"furnished": boolean | null,"id": number,"kpm": number | null,"last_seen": string,"m2": number | null,"notes": (string)[],"place_id": number,"removed_at": string | null,"rent": number | null,"rooms": number | null,"same_as": number | null,"source": string,"source_id": string,"start_date": string | null,"street": string | null,"student": boolean | null,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string | null,"content_hash": string,"end_date"?: string | null,"first_hand"?: boolean | null,"first_seen": string,"flags"?: (string)[],"furnished"?: boolean | null,"id"?: never,"kpm"?: never,"last_seen": string,"m2"?: number | null,"notes"?: (string)[],"place_id": number,"removed_at"?: string | null,"rent"?: number | null,"rooms"?: number | null,"same_as"?: number | null,"source": string,"source_id": string,"start_date"?: string | null,"street"?: string | null,"student"?: boolean | null,"url": string
                  }
                  Update: {
                    "area"?: string | null,"content_hash"?: string,"end_date"?: string | null,"first_hand"?: boolean | null,"first_seen"?: string,"flags"?: (string)[],"furnished"?: boolean | null,"id"?: never,"kpm"?: never,"last_seen"?: string,"m2"?: number | null,"notes"?: (string)[],"place_id"?: number,"removed_at"?: string | null,"rent"?: number | null,"rooms"?: number | null,"same_as"?: number | null,"source"?: string,"source_id"?: string,"start_date"?: string | null,"street"?: string | null,"student"?: boolean | null,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_same_as_fkey"
      columns: ["same_as"]
isOneToOne: false
      referencedRelation: "active_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_same_as_fkey"
      columns: ["same_as"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_same_as_fkey"
      columns: ["same_as"]
isOneToOne: false
      referencedRelation: "listings_karlaplan"
      referencedColumns: ["id"]
    }
                  ]
                },"places": {
                  Row: {
                    "exact": boolean,"id": number,"lat": number,"lon": number
                  }
                  ComputedFields: never
                  Insert: {
                    "exact"?: boolean,"id"?: never,"lat": number,"lon": number
                  }
                  Update: {
                    "exact"?: boolean,"id"?: never,"lat"?: number,"lon"?: number
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"runs": {
                  Row: {
                    "finished_at": string | null,"id": number,"ok": boolean | null,"started_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string | null,"id"?: never,"ok"?: boolean | null,"started_at"?: string
                  }
                  Update: {
                    "finished_at"?: string | null,"id"?: never,"ok"?: boolean | null,"started_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"saved_searches": {
                  Row: {
                    "alerts": boolean,"filters": Json,"id": number,"last_sent_on": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alerts"?: boolean,"filters"?: Json,"id"?: never,"last_sent_on"?: string | null,"user_id": string
                  }
                  Update: {
                    "alerts"?: boolean,"filters"?: Json,"id"?: never,"last_sent_on"?: string | null,"user_id"?: string
                  }
                  Relationships: []
                },"source_runs": {
                  Row: {
                    "complete": boolean,"duration_ms": number | null,"error": string | null,"fetched": number,"invalid": number,"kept": number,"pages": number | null,"raw_path": string | null,"raw_sha256": string | null,"run_id": number,"skipped": number,"source": string
                  }
                  ComputedFields: never
                  Insert: {
                    "complete": boolean,"duration_ms"?: number | null,"error"?: string | null,"fetched": number,"invalid"?: number,"kept": number,"pages"?: number | null,"raw_path"?: string | null,"raw_sha256"?: string | null,"run_id": number,"skipped"?: number,"source": string
                  }
                  Update: {
                    "complete"?: boolean,"duration_ms"?: number | null,"error"?: string | null,"fetched"?: number,"invalid"?: number,"kept"?: number,"pages"?: number | null,"raw_path"?: string | null,"raw_sha256"?: string | null,"run_id"?: number,"skipped"?: number,"source"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "source_runs_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "runs"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "current_period_end": string | null,"last_event_id": string | null,"status": string | null,"stripe_customer": string | null,"stripe_subscription": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "current_period_end"?: string | null,"last_event_id"?: string | null,"status"?: string | null,"stripe_customer"?: string | null,"stripe_subscription"?: string | null,"user_id": string
                  }
                  Update: {
                    "current_period_end"?: string | null,"last_event_id"?: string | null,"status"?: string | null,"stripe_customer"?: string | null,"stripe_subscription"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"travel_matrix": {
                  Row: {
                    "cell": string,"computed_at": string,"gtfs_hash": string,"minutes": (number)[],"place_ids": (number)[],"profile": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cell": string,"computed_at"?: string,"gtfs_hash": string,"minutes": (number)[],"place_ids": (number)[],"profile": string
                  }
                  Update: {
                    "cell"?: string,"computed_at"?: string,"gtfs_hash"?: string,"minutes"?: (number)[],"place_ids"?: (number)[],"profile"?: string
                  }
                  Relationships: [
                    
                  ]
                },"travel_times": {
                  Row: {
                    "computed_at": string,"dest_lat": number,"dest_lon": number,"legs": Json | null,"minutes": number,"place_id": number,"profile": string,"transit_min": number | null,"walk_min": number
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"dest_lat": number,"dest_lon": number,"legs"?: Json | null,"minutes": number,"place_id": number,"profile"?: string,"transit_min"?: number | null,"walk_min": number
                  }
                  Update: {
                    "computed_at"?: string,"dest_lat"?: number,"dest_lon"?: number,"legs"?: Json | null,"minutes"?: number,"place_id"?: number,"profile"?: string,"transit_min"?: number | null,"walk_min"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "travel_times_place_id_fkey"
      columns: ["place_id"]
isOneToOne: false
      referencedRelation: "places"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "active_listings": {
                  Row: {
                    "area": string | null,"end_date": string | null,"exact": boolean,"first_hand": boolean | null,"first_seen": string,"flags": (string)[],"furnished": boolean | null,"id": number,"kpm": number | null,"lat": number,"legs": Json | null,"lon": number,"m2": number | null,"minutes": number | null,"notes": (string)[],"rent": number | null,"rooms": number | null,"source": string,"start_date": string | null,"street": string | null,"student": boolean | null,"transit_min": number | null,"url": string,"walk_min": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"listings_karlaplan": {
                  Row: {
                    "also_on": (string)[] | null,"area": string | null,"end_date": string | null,"exact": boolean,"first_hand": boolean | null,"first_seen": string,"flags": (string)[],"furnished": boolean | null,"id": number,"kpm": number | null,"lat": number,"legs": Json | null,"lon": number,"m2": number | null,"minutes": number | null,"notes": (string)[],"rent": number | null,"rooms": number | null,"source": string,"source_id": string,"start_date": string | null,"street": string | null,"student": boolean | null,"transit_min": number | null,"url": string,"place_id": number
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "is_karlaplan":
{ Args: { "lat": number,"lon": number }; Returns: boolean
                           },
"is_paying":
{ Args: { "uid": string }; Returns: boolean
                           },
"worker_health_check":
{ Args: { "force"?: boolean }; Returns: string
                           },
"worker_health_problems":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
