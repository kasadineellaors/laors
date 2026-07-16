export interface OwnerRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_name: string | null;
  ownership_type: string | null;
  is_ownership_group: boolean;
  yardage_rate_per_head_day: number | null;
  medicine_markup_percent: number | null;
  feed_markup_percent: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerGroupMember {
  id: string;
  member_owner_id: string;
  member_name: string;
  percentage: number;
}

export interface OwnerOption {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  is_ownership_group: boolean;
  yardage_rate_per_head_day: number | null;
  medicine_markup_percent: number | null;
  feed_markup_percent: number | null;
}

export interface OwnerMiscCharge {
  id: string;
  owner_id: string;
  cattle_group_id: string | null;
  cattle_group_name: string | null;
  charge_date: string;
  description: string;
  amount: number;
  invoiced_at: string | null;
  notes: string | null;
}
