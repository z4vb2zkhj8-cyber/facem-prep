
-- Run in Supabase SQL editor. Requires Supabase Auth Email OTP enabled.
create extension if not exists pgcrypto;
create table if not exists public.facem_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 role text not null check(role in ('admin','reviewer')),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists facem_members_email_idx on public.facem_members(lower(email));
create table if not exists public.facem_invites (
 email text primary key,
 invited_by uuid references auth.users(id),
 created_at timestamptz not null default now()
);
create table if not exists public.facem_proposals (
 id uuid primary key default gen_random_uuid(),
 question_id text not null,
 proposed_question text not null,
 proposed_options jsonb not null,
 proposed_answer integer not null check(proposed_answer between 0 and 4),
 proposed_explanation text not null,
 reviewer_id uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 admin_note text,
 decided_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 constraint options_five_or_four check(jsonb_typeof(proposed_options)='array' and jsonb_array_length(proposed_options) between 4 and 5 and proposed_answer < jsonb_array_length(proposed_options))
);
create table if not exists public.facem_published (
 question_id text primary key,
 question text not null,
 options jsonb not null,
 answer integer not null,
 explanation text not null,
 proposal_id uuid unique references public.facem_proposals(id),
 published_at timestamptz not null default now()
);
alter table public.facem_members enable row level security;
alter table public.facem_invites enable row level security;
alter table public.facem_proposals enable row level security;
alter table public.facem_published enable row level security;
revoke all on public.facem_members,public.facem_invites,public.facem_proposals,public.facem_published from anon,authenticated;
grant select on public.facem_members to authenticated;
grant select on public.facem_proposals to authenticated;
grant select on public.facem_published to anon,authenticated;
create policy "members can read own membership" on public.facem_members for select to authenticated using (user_id=auth.uid());
create policy "members can read proposals" on public.facem_proposals for select to authenticated using (
 exists(select 1 from public.facem_members m where m.user_id=auth.uid() and m.active)
);
create policy "anyone can read approved overrides" on public.facem_published for select to anon,authenticated using (true);

create or replace function public.facem_accept_invitation()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare e text; r text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select lower(email) into e from auth.users where id=auth.uid();
 if e is null then raise exception 'Email unavailable'; end if;
 select role into r from public.facem_members where user_id=auth.uid() and active;
 if r is not null then return r; end if;
 if not exists(select 1 from public.facem_invites where lower(email)=e) then raise exception 'This email has not been invited'; end if;
 insert into public.facem_members(user_id,email,role) values(auth.uid(),e,'reviewer')
 on conflict(user_id) do update set active=true,email=excluded.email;
 return 'reviewer';
end $$;

create or replace function public.facem_invite_reviewer(p_email text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.facem_members where user_id=auth.uid() and role='admin' and active) then raise exception 'Admin only'; end if;
 if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Invalid email'; end if;
 insert into public.facem_invites(email,invited_by) values(lower(trim(p_email)),auth.uid())
 on conflict(email) do nothing;
end $$;

create or replace function public.facem_revoke_reviewer(p_email text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not exists(select 1 from public.facem_members where user_id=auth.uid() and role='admin' and active) then raise exception 'Admin only'; end if;
 delete from public.facem_invites where email=lower(trim(p_email));
 update public.facem_members set active=false where lower(email)=lower(trim(p_email)) and role='reviewer';
end $$;

create or replace function public.facem_submit_proposal(p_question_id text,p_question text,p_options jsonb,p_answer integer,p_explanation text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_id uuid;
begin
 if not exists(select 1 from public.facem_members where user_id=auth.uid() and active) then raise exception 'Reviewer access required'; end if;
 if length(coalesce(p_question_id,''))<1 or length(coalesce(p_question,''))<5 or length(coalesce(p_explanation,''))<5 then raise exception 'Complete the proposal fields'; end if;
 if jsonb_typeof(p_options)<>'array' or jsonb_array_length(p_options) not between 4 and 5 or p_answer not between 0 and jsonb_array_length(p_options)-1 then raise exception 'Invalid answer options'; end if;
 insert into public.facem_proposals(question_id,proposed_question,proposed_options,proposed_answer,proposed_explanation,reviewer_id)
 values(p_question_id,p_question,p_options,p_answer,p_explanation,auth.uid()) returning id into new_id;
 return new_id;
end $$;

create or replace function public.facem_decide_proposal(p_id uuid,p_approve boolean,p_note text default '')
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.facem_proposals%rowtype;
begin
 if not exists(select 1 from public.facem_members where user_id=auth.uid() and role='admin' and active) then raise exception 'Admin only'; end if;
 select * into p from public.facem_proposals where id=p_id for update;
 if not found or p.status<>'pending' then raise exception 'Proposal unavailable or already decided'; end if;
 update public.facem_proposals set status=case when p_approve then 'approved' else 'rejected' end,admin_note=p_note,decided_by=auth.uid(),decided_at=now() where id=p_id;
 if p_approve then
 insert into public.facem_published(question_id,question,options,answer,explanation,proposal_id,published_at)
 values(p.question_id,p.proposed_question,p.proposed_options,p.proposed_answer,p.proposed_explanation,p.id,now())
 on conflict(question_id) do update set question=excluded.question,options=excluded.options,answer=excluded.answer,explanation=excluded.explanation,proposal_id=excluded.proposal_id,published_at=now();
 end if;
end $$;

revoke all on function public.facem_accept_invitation(),public.facem_invite_reviewer(text),public.facem_revoke_reviewer(text),public.facem_submit_proposal(text,text,jsonb,integer,text),public.facem_decide_proposal(uuid,boolean,text) from public,anon;
grant execute on function public.facem_accept_invitation(),public.facem_invite_reviewer(text),public.facem_revoke_reviewer(text),public.facem_submit_proposal(text,text,jsonb,integer,text),public.facem_decide_proposal(uuid,boolean,text) to authenticated;

-- IMPORTANT: Bootstrap the first admin AFTER they sign in with a code.
-- Replace admin@example.com with YOUR verified sign-in email; run once in SQL editor:
-- insert into public.facem_members(user_id,email,role)
-- select id,lower(email),'admin' from auth.users where lower(email)='admin@example.com'
-- on conflict(user_id) do update set role='admin',active=true;
