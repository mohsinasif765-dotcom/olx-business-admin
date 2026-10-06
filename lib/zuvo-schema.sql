create table if not exists public.car_packages (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('new', 'used')),
  invest text not null,
  returns text not null,
  term text not null,
  image text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id text primary key,
  account text unique not null,
  vip text not null default '—',
  invite text not null default '',
  upline text not null default '—',
  invest numeric not null default 0,
  brokerage numeric not null default 0,
  status text not null default 'active',
  joined text not null default '',
  login_password text not null default '',
  security_password text not null default '',
  name text not null default ''
);

alter table public.members add column if not exists name text not null default '';

create table if not exists public.ops_snapshot (
  id int primary key default 1 check (id = 1),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.car_holdings (
  id text primary key,
  account text not null,
  plan_id text not null,
  name text not null,
  kind text not null,
  invest text not null,
  invest_amount numeric not null default 0,
  returns text not null,
  term text not null,
  image text not null,
  status text not null default 'active',
  started_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  site_name text not null default 'OLX Business',
  telegram text not null default 'https://t.me/olxbusiness_help',
  default_lang text not null default 'en',
  register_on boolean not null default true,
  login_on boolean not null default true,
  recharge_on boolean not null default true,
  withdraw_on boolean not null default true,
  transfer_on boolean not null default true,
  packages_on boolean not null default true,
  min_withdraw numeric not null default 1,
  payout_fee numeric not null default 1,
  daily_cap numeric not null default 5000,
  maintenance text not null default '',
  commission_l1 numeric not null default 15,
  commission_l2 numeric not null default 3,
  commission_l3 numeric not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_auth (
  id int primary key default 1 check (id = 1),
  username text not null default 'admin',
  password text not null default 'olx2026'
);

create table if not exists public.pay_rails (
  id text primary key,
  name text not null,
  network text not null default '',
  min text not null default '10',
  address text not null default '',
  enabled boolean not null default true,
  pay_kind text not null default 'bank',
  bank_name text not null default '',
  account_name text not null default '',
  account_number text not null default '',
  iban text not null default '',
  swift text not null default '',
  branch text not null default '',
  instructions text not null default ''
);

create table if not exists public.cms_pages (
  slug text primary key,
  title text not null,
  body text not null default ''
);

create table if not exists public.notices (
  id text primary key,
  title text not null,
  body text not null default '',
  enabled boolean not null default true
);

create table if not exists public.faqs (
  id text primary key,
  tab text not null default 'about',
  title text not null,
  body text not null default '',
  enabled boolean not null default true
);

create table if not exists public.activities (
  id text primary key,
  title text not null,
  description text not null default '',
  time_label text not null default '',
  status text not null default 'live',
  enabled boolean not null default true
);

create table if not exists public.activity_state (
  account text primary key,
  checkin_date text not null default '',
  checkin_streak int not null default 0,
  lucky_date text not null default '',
  lucky_prize text not null default ''
);

create table if not exists public.recharges (
  id text primary key,
  account text not null,
  amount numeric not null default 0,
  network text not null default '',
  tx_hash text not null default '',
  status text not null default 'pending',
  at text not null default '',
  note text not null default ''
);

create table if not exists public.withdraws (
  id text primary key,
  account text not null,
  amount numeric not null default 0,
  wallet text not null default '',
  address text not null default '',
  status text not null default 'pending',
  at text not null default '',
  note text not null default ''
);

create table if not exists public.transfers (
  id text primary key,
  account text not null,
  from_wallet text not null default 'invest',
  to_wallet text not null default 'brokerage',
  amount numeric not null default 0,
  at text not null default ''
);

create table if not exists public.audit_log (
  id text primary key,
  at text not null default '',
  actor text not null default 'admin',
  action text not null,
  target text not null default '',
  amount text not null default ''
);

create table if not exists public.ledger_tx (
  id text primary key,
  account text not null,
  kind text not null,
  amount numeric not null default 0,
  wallet text not null default 'invest',
  status text not null default 'pending',
  note text not null default '',
  at text not null default ''
);

alter table public.recharges add column if not exists slip_url text not null default '';
alter table public.site_settings add column if not exists signup_bonus numeric not null default 0;
alter table public.site_settings add column if not exists invite_bonus numeric not null default 0;
alter table public.site_settings add column if not exists checkin_rewards text not null default '0.10,0.12,0.15,0.18,0.22,0.28,0.80';
alter table public.site_settings add column if not exists lucky_prizes text not null default '0.10,0.20,0.50,1.00,2.00,0.00';

alter table public.car_packages enable row level security;
alter table public.members enable row level security;
alter table public.ops_snapshot enable row level security;
alter table public.car_holdings enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_auth enable row level security;
alter table public.pay_rails enable row level security;
alter table public.cms_pages enable row level security;
alter table public.notices enable row level security;
alter table public.faqs enable row level security;
alter table public.activities enable row level security;
alter table public.activity_state enable row level security;
alter table public.recharges enable row level security;
alter table public.withdraws enable row level security;
alter table public.transfers enable row level security;
alter table public.audit_log enable row level security;
alter table public.ledger_tx enable row level security;

drop policy if exists "public read live packages" on public.car_packages;
create policy "public read live packages"
on public.car_packages
for select
to anon, authenticated
using (enabled = true);

grant select on public.car_packages to anon, authenticated;
grant all on public.car_packages to service_role;
grant all on public.members to service_role;
grant all on public.ops_snapshot to service_role;
grant all on public.car_holdings to service_role;
grant all on public.site_settings to service_role;
grant all on public.admin_auth to service_role;
grant all on public.pay_rails to service_role;
grant all on public.cms_pages to service_role;
grant all on public.notices to service_role;
grant all on public.faqs to service_role;
grant all on public.activities to service_role;
grant all on public.activity_state to service_role;
grant all on public.recharges to service_role;
grant all on public.withdraws to service_role;
grant all on public.transfers to service_role;
grant all on public.audit_log to service_role;
grant all on public.ledger_tx to service_role;

grant select on public.site_settings to anon, authenticated;
grant select on public.pay_rails to anon, authenticated;
grant select on public.cms_pages to anon, authenticated;
grant select on public.notices to anon, authenticated;
grant select on public.faqs to anon, authenticated;
grant select on public.activities to anon, authenticated;
