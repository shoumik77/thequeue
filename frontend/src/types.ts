export type SessionOut = {
  id: number
  name: string
  slug: string
  is_active: boolean
  created_at: string
  ends_at?: string | null
}

export type RequestOut = {
  id: number
  session_id: number
  guest_name?: string | null
  song_title: string
  artist?: string | null
  note?: string | null
  status: 'pending' | 'accepted' | 'playing' | 'done' | 'rejected'
  position: number
  tip_amount?: number | null
  votes: number
  created_at: string
}
