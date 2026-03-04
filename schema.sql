


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_type" AS ENUM (
    'shared',
    'individual'
);


ALTER TYPE "public"."account_type" OWNER TO "postgres";


CREATE TYPE "public"."employee_role" AS ENUM (
    'admin',
    'dealer',
    'mechanic',
    'detailer',
    'listing'
);


ALTER TYPE "public"."employee_role" OWNER TO "postgres";


CREATE TYPE "public"."inspection_type" AS ENUM (
    'intake',
    'final'
);


ALTER TYPE "public"."inspection_type" OWNER TO "postgres";


CREATE TYPE "public"."issue_category" AS ENUM (
    'scratch',
    'dent',
    'rust',
    'other'
);


ALTER TYPE "public"."issue_category" OWNER TO "postgres";


CREATE TYPE "public"."issue_severity" AS ENUM (
    'low',
    'mid',
    'high'
);


ALTER TYPE "public"."issue_severity" OWNER TO "postgres";


CREATE TYPE "public"."listing_status" AS ENUM (
    'draft',
    'published',
    'offline',
    'deleted',
    'failed'
);


ALTER TYPE "public"."listing_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'cash',
    'transfer',
    'credit',
    'leasing'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."sale_status" AS ENUM (
    'draft',
    'contract_generated',
    'handover_done',
    'archived'
);


ALTER TYPE "public"."sale_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'open',
    'in_progress',
    'done',
    'blocked',
    'overdue'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."task_type" AS ENUM (
    'listing_create',
    'detail_intake',
    'listing_photos',
    'sale_prep',
    'mechanic_prep',
    'detail_final',
    'handover'
);


ALTER TYPE "public"."task_type" OWNER TO "postgres";


CREATE TYPE "public"."vehicle_status" AS ENUM (
    'draft',
    'active',
    'sold',
    'handover_ready',
    'archived'
);


ALTER TYPE "public"."vehicle_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_title text;
begin
  -- Bedingung: Fahrzeug wurde "aktiv"/"inseriert"
  -- A) carx_vehicle_id wurde gesetzt
  -- oder
  -- B) status wechselt auf active
  if not (
    (old.carx_vehicle_id is null and new.carx_vehicle_id is not null)
    or
    (old.status is distinct from new.status and new.status = 'active'::vehicle_status)
  ) then
    return new;
  end if;

  -- Duplikate vermeiden (falls Index nicht greift oder früher angelegt)
  if exists (
    select 1
    from public.tasks t
    where t.vehicle_id = new.id
      and t.type = 'detail_intake'::task_type
    limit 1
  ) then
    return new;
  end if;

  v_title := coalesce(nullif(new.draft_model, ''), new.vin, 'Aufbereitung');

  insert into public.tasks (
    vehicle_id,
    type,
    assigned_role,
    title,
    payload
  ) values (
    new.id,
    'detail_intake'::task_type,
    'detailer'::employee_role,
    'Aufbereitung: ' || v_title,
    jsonb_build_object(
      'trigger', 'vehicle_activated',
      'vehicle_status', new.status,
      'carx_vehicle_id', new.carx_vehicle_id
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_listing_create_task_on_vehicle_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_title text;
begin
  -- Nur wenn Fahrzeug neu angelegt wird (draft)
  -- (wenn du später auch andere Status beim Insert erlaubst, kannst du das lockern)
  if new.status is distinct from 'draft'::vehicle_status then
    return new;
  end if;

  -- Duplikate (zusätzlich zum Index)
  if exists (
    select 1 from public.tasks t
    where t.vehicle_id = new.id
      and t.type = 'listing_create'::task_type
      and t.status <> 'done'::task_status
    limit 1
  ) then
    return new;
  end if;

  v_title := coalesce(nullif(new.draft_model, ''), new.vin, 'Neues Fahrzeug');

  insert into public.tasks (
    vehicle_id,
    type,
    assigned_role,
    title,
    payload
  ) values (
    new.id,
    'listing_create'::task_type,
    'listing'::employee_role,
    'Inserat erstellen: ' || v_title,
    jsonb_build_object(
      'trigger', 'vehicle_insert',
      'vehicle_status', new.status
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."create_listing_create_task_on_vehicle_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Nur wenn Status wirklich auf done gewechselt ist
  if not (
    old.status is distinct from new.status
    and new.status = 'done'::task_status
  ) then
    return new;
  end if;

  -- Nur für Aufbereiter-Intake Task
  if new.type is distinct from 'detail_intake'::task_type then
    return new;
  end if;

  -- Duplikate vermeiden (zusätzlich zum Index)
  if exists (
    select 1
    from public.tasks t
    where t.vehicle_id = new.vehicle_id
      and t.type = 'listing_photos'::task_type
      and t.status <> 'done'::task_status
    limit 1
  ) then
    return new;
  end if;

  insert into public.tasks (
    vehicle_id,
    type,
    assigned_role,
    title,
    payload
  ) values (
    new.vehicle_id,
    'listing_photos'::task_type,
    'listing'::employee_role,
    'Bilder hochladen',
    jsonb_build_object(
      'trigger', 'detail_intake_done',
      'source_task_id', new.id
    )
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_account_role"() RETURNS "public"."employee_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select a.role
  from public.accounts a
  where a.user_id = auth.uid() and a.active = true
$$;


ALTER FUNCTION "public"."current_account_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."employee_belongs_to_current_account"("emp_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1
    from public.employees e
    where e.id = emp_id
      and e.account_user_id = auth.uid()
      and e.active = true
  );
$$;


ALTER FUNCTION "public"."employee_belongs_to_current_account"("emp_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_account"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.accounts a
    where a.user_id = auth.uid() and a.active = true
  )
$$;


ALTER FUNCTION "public"."is_active_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select exists (
    select 1
    from public.accounts a
    where a.user_id = auth.uid()
      and a.active = true
      and a.role = 'admin'::public.employee_role
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_auth_user_created_app_accounts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.app_accounts (user_id)
  values (new.id)
  on conflict do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."on_auth_user_created_app_accounts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."on_auth_user_created_bootstrap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- accounts row (safe defaults)
  insert into public.accounts (user_id, role, account_type, active, created_at)
  values (new.id, 'listing'::public.employee_role, 'individual'::public.account_type, true, now())
  on conflict (user_id) do nothing;

  -- app_accounts row
  insert into public.app_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."on_auth_user_created_bootstrap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  exists_active boolean;
begin
  -- only when status transitions to contract_generated
  if (tg_op <> 'UPDATE') then
    return new;
  end if;

  if new.status is distinct from old.status
     and new.status = 'contract_generated'::sale_status then

    -- ✅ NEW: vehicle_status -> sold (nur wenn noch nicht weiter im Prozess)
    update public.vehicles
    set status = 'sold'::vehicle_status,
        updated_at = now()
    where id = new.vehicle_id
      and status in ('draft'::vehicle_status, 'active'::vehicle_status);

    -- create sale_prep task (dealer)
    select exists (
      select 1
      from public.tasks t
      where t.vehicle_id = new.vehicle_id
        and t.type = 'sale_prep'::task_type
        and t.status in (
          'open'::task_status,
          'in_progress'::task_status,
          'blocked'::task_status,
          'overdue'::task_status
        )
    ) into exists_active;

    if not exists_active then
      insert into public.tasks (
        vehicle_id,
        type,
        status,
        assigned_role,
        assigned_employee_id,
        actor_employee_id,
        title,
        payload
      )
      values (
        new.vehicle_id,
        'sale_prep'::task_type,
        'open'::task_status,
        'dealer'::employee_role,
        new.dealer_employee_id,
        new.dealer_employee_id,
        'Verkaufsabwicklung (Top Verkäufer)',
        jsonb_build_object(
          'sale_id', new.id,
          'stage', 'sale_prep'
        )
      );
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_tasks_done_cascade"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sale_id uuid;
  dealer_id uuid;
  has_active boolean;
begin
  if (tg_op <> 'UPDATE') then
    return new;
  end if;

  -- only on transition to done
  if not (new.status is distinct from old.status and new.status = 'done'::task_status) then
    return new;
  end if;

  -- resolve sale_id from payload (preferred), fallback latest sale
  sale_id := public.try_uuid(new.payload->>'sale_id');

  if sale_id is null then
    select s.id
      into sale_id
    from public.sales s
    where s.vehicle_id = new.vehicle_id
    order by s.created_at desc
    limit 1;
  end if;

  select s.dealer_employee_id
    into dealer_id
  from public.sales s
  where s.id = sale_id
  limit 1;

  -- mechanic_prep done -> create detail_final (detailer)
  if new.type = 'mechanic_prep'::task_type then
    select exists (
      select 1
      from public.tasks t
      where t.vehicle_id = new.vehicle_id
        and t.type = 'detail_final'::task_type
        and t.status in ('open'::task_status, 'in_progress'::task_status, 'blocked'::task_status, 'overdue'::task_status)
    ) into has_active;

    if not has_active then
      insert into public.tasks (
        vehicle_id,
        type,
        status,
        assigned_role,
        assigned_employee_id,
        actor_employee_id,
        title,
        payload
      )
      values (
        new.vehicle_id,
        'detail_final'::task_type,
        'open'::task_status,
        'detailer'::employee_role,
        null,
        new.assigned_employee_id,
        'Aufbereitung final',
        jsonb_build_object(
          'sale_id', sale_id,
          'stage', 'detail_final'
        )
      );
    end if;
  end if;

  -- detail_final done -> set vehicle handover_ready + create handover task for dealer
  if new.type = 'detail_final'::task_type then
    update public.vehicles
    set status = 'handover_ready'::vehicle_status,
        updated_at = now()
    where id = new.vehicle_id;

    select exists (
      select 1
      from public.tasks t
      where t.vehicle_id = new.vehicle_id
        and t.type = 'handover'::task_type
        and t.status in ('open'::task_status, 'in_progress'::task_status, 'blocked'::task_status, 'overdue'::task_status)
    ) into has_active;

    if not has_active then
      insert into public.tasks (
        vehicle_id,
        type,
        status,
        assigned_role,
        assigned_employee_id,
        actor_employee_id,
        title,
        payload
      )
      values (
        new.vehicle_id,
        'handover'::task_type,
        'open'::task_status,
        'dealer'::employee_role,
        dealer_id,
        new.assigned_employee_id,
        'Übergabe bestätigen',
        jsonb_build_object(
          'sale_id', sale_id,
          'stage', 'handover'
        )
      );
    end if;
  end if;

  -- handover done -> mark sale + vehicle archived (sold)
  if new.type = 'handover'::task_type then
    update public.sales
    set status = 'handover_done'::sale_status,
        updated_at = now()
    where id = sale_id;

    update public.vehicles
    set status = 'archived'::vehicle_status,
        updated_at = now()
    where id = new.vehicle_id;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_tasks_done_cascade"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  sale_id uuid;
  dealer_id uuid;
  existing_task_id uuid;
  has_mech_active boolean;
begin
  if (tg_op <> 'INSERT') then
    return new;
  end if;

  -- Find latest sale for this vehicle (should be contract_generated)
  select s.id, s.dealer_employee_id
    into sale_id, dealer_id
  from public.sales s
  where s.vehicle_id = new.vehicle_id
  order by s.created_at desc
  limit 1;

  -- 2a) mark latest active sale_prep as done
  select t.id
    into existing_task_id
  from public.tasks t
  where t.vehicle_id = new.vehicle_id
    and t.type = 'sale_prep'::task_type
    and t.status in ('open'::task_status, 'in_progress'::task_status, 'blocked'::task_status, 'overdue'::task_status)
  order by t.created_at desc
  limit 1;

  if existing_task_id is not null then
    update public.tasks
    set status = 'done'::task_status,
        done_at = now(),
        updated_at = now()
    where id = existing_task_id;
  end if;

  -- 2b) create mechanic_prep if not exists active
  select exists (
    select 1
    from public.tasks t
    where t.vehicle_id = new.vehicle_id
      and t.type = 'mechanic_prep'::task_type
      and t.status in ('open'::task_status, 'in_progress'::task_status, 'blocked'::task_status, 'overdue'::task_status)
  ) into has_mech_active;

  if not has_mech_active then
    insert into public.tasks (
      vehicle_id,
      type,
      status,
      assigned_role,
      assigned_employee_id,
      actor_employee_id,
      title,
      payload
    )
    values (
      new.vehicle_id,
      'mechanic_prep'::task_type,
      'open'::task_status,
      'mechanic'::employee_role,
      null,
      dealer_id,
      'Mechaniker Vorbereitung',
      jsonb_build_object(
        'sale_id', sale_id,
        'sale_prep_id', new.id,
        'stage', 'mechanic_prep'
      )
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."try_uuid"("t" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  if t is null or btrim(t) = '' then
    return null;
  end if;

  return t::uuid;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."try_uuid"("t" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "user_id" "uuid" NOT NULL,
    "role" "public"."employee_role" DEFAULT 'listing'::"public"."employee_role" NOT NULL,
    "account_type" "public"."account_type" DEFAULT 'individual'::"public"."account_type" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_account_employees" (
    "user_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_account_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_accounts" (
    "user_id" "uuid" NOT NULL,
    "is_shared" boolean DEFAULT false NOT NULL,
    "default_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_employee_invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "invite_type" "text" DEFAULT 'employee'::"text" NOT NULL,
    "role" "public"."employee_role",
    "created_by_user_id" "uuid",
    CONSTRAINT "app_employee_invites_invite_type_check" CHECK (("invite_type" = ANY (ARRAY['employee'::"text", 'role'::"text"])))
);


ALTER TABLE "public"."app_employee_invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buyers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "full_name" "text" NOT NULL,
    "address" "text",
    "email" "public"."citext",
    "phone" "text",
    "birthdate" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."buyers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_user_id" "uuid",
    "display_name" "text" NOT NULL,
    "role" "public"."employee_role" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspection_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inspection_id" "uuid" NOT NULL,
    "category" "public"."issue_category" NOT NULL,
    "severity" "public"."issue_severity" NOT NULL,
    "position" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "comment" "text",
    "photo_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inspection_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inspections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "type" "public"."inspection_type" NOT NULL,
    "notes" "text",
    "actor_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inspections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."listings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "platform" "text" DEFAULT 'carx'::"text" NOT NULL,
    "status" "public"."listing_status" DEFAULT 'draft'::"public"."listing_status" NOT NULL,
    "external_id" "text",
    "last_error" "text",
    "published_at" timestamp with time zone,
    "offline_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."listings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_contract_details" (
    "sale_id" "uuid" NOT NULL,
    "cond_a" smallint,
    "cond_b" smallint,
    "cond_c" smallint,
    "cond_d" smallint,
    "cond_e" smallint,
    "contract_date" "date",
    "handover_date" "date",
    "other_agreements" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "cond_overall" smallint,
    CONSTRAINT "cond_a_range" CHECK ((("cond_a" IS NULL) OR (("cond_a" >= 1) AND ("cond_a" <= 4)))),
    CONSTRAINT "cond_b_range" CHECK ((("cond_b" IS NULL) OR (("cond_b" >= 1) AND ("cond_b" <= 4)))),
    CONSTRAINT "cond_c_range" CHECK ((("cond_c" IS NULL) OR (("cond_c" >= 1) AND ("cond_c" <= 4)))),
    CONSTRAINT "cond_d_range" CHECK ((("cond_d" IS NULL) OR (("cond_d" >= 1) AND ("cond_d" <= 4)))),
    CONSTRAINT "cond_e_range" CHECK ((("cond_e" IS NULL) OR (("cond_e" >= 1) AND ("cond_e" <= 4)))),
    CONSTRAINT "cond_overall_range" CHECK ((("cond_overall" IS NULL) OR (("cond_overall" >= 1) AND ("cond_overall" <= 4))))
);


ALTER TABLE "public"."sale_contract_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "buyer_id" "uuid",
    "dealer_employee_id" "uuid",
    "actor_employee_id" "uuid",
    "sale_price" numeric,
    "down_payment" numeric,
    "payment_type" "public"."payment_type",
    "bank_name" "text",
    "status" "public"."sale_status" DEFAULT 'draft'::"public"."sale_status" NOT NULL,
    "contract_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "type" "public"."task_type" NOT NULL,
    "status" "public"."task_status" DEFAULT 'open'::"public"."task_status" NOT NULL,
    "assigned_role" "public"."employee_role" NOT NULL,
    "assigned_employee_id" "uuid",
    "actor_employee_id" "uuid",
    "created_by_employee_id" "uuid",
    "title" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "due_at" timestamp with time zone,
    "done_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "actor_employee_id" "uuid",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicle_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_sale_prep" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "dealer_employee_id" "uuid",
    "top_seller_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "attachment_urls" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicle_sale_prep" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vin" "public"."citext" NOT NULL,
    "carx_vehicle_id" "text",
    "status" "public"."vehicle_status" DEFAULT 'draft'::"public"."vehicle_status" NOT NULL,
    "draft_model" "text",
    "draft_year" integer,
    "key_count" integer DEFAULT 0 NOT NULL,
    "tire_count" integer DEFAULT 4 NOT NULL,
    "has_rims" boolean DEFAULT false NOT NULL,
    "purchase_price" numeric,
    "target_selling_price" numeric,
    "draft_notes" "text",
    "internal_image_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "registration_doc_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "carx_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "carx_synced_at" timestamp with time zone,
    "created_by_account" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workcards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "notes" "text",
    "photo_urls" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "actor_employee_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workcards" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_account_employees"
    ADD CONSTRAINT "app_account_employees_pkey" PRIMARY KEY ("user_id", "employee_id");



ALTER TABLE ONLY "public"."app_accounts"
    ADD CONSTRAINT "app_accounts_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_employee_invites"
    ADD CONSTRAINT "app_employee_invites_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."app_employee_invites"
    ADD CONSTRAINT "app_employee_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buyers"
    ADD CONSTRAINT "buyers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_vehicle_id_platform_key" UNIQUE ("vehicle_id", "platform");



ALTER TABLE ONLY "public"."sale_contract_details"
    ADD CONSTRAINT "sale_contract_details_pkey" PRIMARY KEY ("sale_id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_vehicle_id_key" UNIQUE ("vehicle_id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_events"
    ADD CONSTRAINT "vehicle_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_sale_prep"
    ADD CONSTRAINT "vehicle_sale_prep_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_sale_prep"
    ADD CONSTRAINT "vehicle_sale_prep_vehicle_id_key" UNIQUE ("vehicle_id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workcards"
    ADD CONSTRAINT "workcards_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_accounts_role" ON "public"."accounts" USING "btree" ("role");



CREATE INDEX "idx_buyers_name" ON "public"."buyers" USING "btree" ("full_name");



CREATE INDEX "idx_employees_account" ON "public"."employees" USING "btree" ("account_user_id");



CREATE INDEX "idx_employees_role" ON "public"."employees" USING "btree" ("role");



CREATE INDEX "idx_inspection_items_inspection" ON "public"."inspection_items" USING "btree" ("inspection_id");



CREATE INDEX "idx_inspections_vehicle_type" ON "public"."inspections" USING "btree" ("vehicle_id", "type");



CREATE INDEX "idx_listings_status" ON "public"."listings" USING "btree" ("status");



CREATE INDEX "idx_listings_vehicle" ON "public"."listings" USING "btree" ("vehicle_id");



CREATE INDEX "idx_sales_status" ON "public"."sales" USING "btree" ("status");



CREATE INDEX "idx_tasks_queue" ON "public"."tasks" USING "btree" ("assigned_role", "status", "created_at");



CREATE INDEX "idx_tasks_vehicle" ON "public"."tasks" USING "btree" ("vehicle_id");



CREATE INDEX "idx_vehicle_events_vehicle" ON "public"."vehicle_events" USING "btree" ("vehicle_id", "created_at");



CREATE INDEX "idx_vehicle_sale_prep_vehicle" ON "public"."vehicle_sale_prep" USING "btree" ("vehicle_id");



CREATE INDEX "idx_vehicles_status" ON "public"."vehicles" USING "btree" ("status");



CREATE INDEX "idx_workcards_vehicle" ON "public"."workcards" USING "btree" ("vehicle_id");



CREATE INDEX "inspection_items_inspection_created_idx" ON "public"."inspection_items" USING "btree" ("inspection_id", "created_at" DESC);



CREATE INDEX "inspections_vehicle_type_created_idx" ON "public"."inspections" USING "btree" ("vehicle_id", "type", "created_at" DESC);



CREATE INDEX "sales_dealer_status_idx" ON "public"."sales" USING "btree" ("dealer_employee_id", "status");



CREATE UNIQUE INDEX "tasks_one_detail_intake_per_vehicle" ON "public"."tasks" USING "btree" ("vehicle_id") WHERE ("type" = 'detail_intake'::"public"."task_type");



CREATE UNIQUE INDEX "tasks_one_open_listing_create" ON "public"."tasks" USING "btree" ("vehicle_id") WHERE (("type" = 'listing_create'::"public"."task_type") AND ("status" <> 'done'::"public"."task_status"));



CREATE UNIQUE INDEX "tasks_one_open_listing_photos" ON "public"."tasks" USING "btree" ("vehicle_id") WHERE (("type" = 'listing_photos'::"public"."task_type") AND ("status" <> 'done'::"public"."task_status"));



CREATE INDEX "tasks_vehicle_type_status_idx" ON "public"."tasks" USING "btree" ("vehicle_id", "type", "status");



CREATE INDEX "vehicle_sale_prep_vehicle_idx" ON "public"."vehicle_sale_prep" USING "btree" ("vehicle_id");



CREATE UNIQUE INDEX "vehicles_carx_vehicle_id_uniq" ON "public"."vehicles" USING "btree" ("carx_vehicle_id") WHERE ("carx_vehicle_id" IS NOT NULL);



CREATE UNIQUE INDEX "vehicles_carx_vehicle_id_unique" ON "public"."vehicles" USING "btree" ("carx_vehicle_id") WHERE ("carx_vehicle_id" IS NOT NULL);



CREATE UNIQUE INDEX "vehicles_vin_unique" ON "public"."vehicles" USING "btree" ("vin");



CREATE OR REPLACE TRIGGER "sales_contract_generated_create_sale_prep_task" AFTER UPDATE OF "status" ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"();



CREATE OR REPLACE TRIGGER "tasks_done_cascade" AFTER UPDATE OF "status" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."trg_tasks_done_cascade"();



CREATE OR REPLACE TRIGGER "trg_app_accounts_updated_at" BEFORE UPDATE ON "public"."app_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_detail_intake_done_create_listing_photos" AFTER UPDATE OF "status" ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"();



CREATE OR REPLACE TRIGGER "trg_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_inspections_updated_at" BEFORE UPDATE ON "public"."inspections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_listings_updated_at" BEFORE UPDATE ON "public"."listings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sale_contract_details_updated_at" BEFORE UPDATE ON "public"."sale_contract_details" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tasks_updated_at" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_vehicle_create_detailer_intake_task" AFTER UPDATE OF "carx_vehicle_id", "status" ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"();



CREATE OR REPLACE TRIGGER "trg_vehicle_create_listing_create_task" AFTER INSERT ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."create_listing_create_task_on_vehicle_insert"();



CREATE OR REPLACE TRIGGER "trg_vehicle_sale_prep_updated_at" BEFORE UPDATE ON "public"."vehicle_sale_prep" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_vehicles_updated_at" BEFORE UPDATE ON "public"."vehicles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "vehicle_sale_prep_insert_create_mechanic_task" AFTER INSERT ON "public"."vehicle_sale_prep" FOR EACH ROW EXECUTE FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_account_employees"
    ADD CONSTRAINT "app_account_employees_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_account_employees"
    ADD CONSTRAINT "app_account_employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."app_accounts"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_accounts"
    ADD CONSTRAINT "app_accounts_default_employee_id_fkey" FOREIGN KEY ("default_employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_accounts"
    ADD CONSTRAINT "app_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_employee_invites"
    ADD CONSTRAINT "app_employee_invites_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."app_employee_invites"
    ADD CONSTRAINT "app_employee_invites_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."app_employee_invites"
    ADD CONSTRAINT "app_employee_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "public"."accounts"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inspection_items"
    ADD CONSTRAINT "inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "public"."inspections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."inspections"
    ADD CONSTRAINT "inspections_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."listings"
    ADD CONSTRAINT "listings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_contract_details"
    ADD CONSTRAINT "sale_contract_details_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_dealer_employee_id_fkey" FOREIGN KEY ("dealer_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_created_by_employee_id_fkey" FOREIGN KEY ("created_by_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_events"
    ADD CONSTRAINT "vehicle_events_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."vehicle_events"
    ADD CONSTRAINT "vehicle_events_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicle_sale_prep"
    ADD CONSTRAINT "vehicle_sale_prep_dealer_employee_id_fkey" FOREIGN KEY ("dealer_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."vehicle_sale_prep"
    ADD CONSTRAINT "vehicle_sale_prep_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_created_by_account_fkey" FOREIGN KEY ("created_by_account") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workcards"
    ADD CONSTRAINT "workcards_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."workcards"
    ADD CONSTRAINT "workcards_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accounts_delete_admin" ON "public"."accounts" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "accounts_insert_admin" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "accounts_select_own" ON "public"."accounts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "accounts_select_self_or_admin" ON "public"."accounts" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "accounts_update_admin" ON "public"."accounts" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."app_account_employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_account_employees_select_own" ON "public"."app_account_employees" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."app_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_accounts_insert_own" ON "public"."app_accounts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "app_accounts_select_own" ON "public"."app_accounts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "app_accounts_update_default_employee" ON "public"."app_accounts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND (("default_employee_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM ("public"."employees" "e"
     JOIN "public"."accounts" "a" ON (("a"."user_id" = "auth"."uid"())))
  WHERE (("e"."id" = "app_accounts"."default_employee_id") AND ("e"."active" = true) AND ("e"."role" = "a"."role") AND (("e"."account_user_id" IS NULL) OR ("e"."account_user_id" = "auth"."uid"()))))))));



CREATE POLICY "app_accounts_update_own" ON "public"."app_accounts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."app_employee_invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "baseline_auth_insert" ON "public"."accounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."buyers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."inspection_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."inspections" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."sale_contract_details" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."vehicle_events" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."vehicle_sale_prep" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_insert" ON "public"."workcards" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "baseline_auth_select" ON "public"."accounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."buyers" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."employees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."inspection_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."inspections" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."listings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."sale_contract_details" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."sales" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."tasks" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."vehicle_events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."vehicle_sale_prep" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_select" ON "public"."workcards" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "baseline_auth_update" ON "public"."accounts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."buyers" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."employees" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."inspection_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."inspections" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."listings" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."sale_contract_details" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."sales" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."vehicle_events" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."vehicle_sale_prep" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "baseline_auth_update" ON "public"."workcards" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."buyers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "buyers_delete_admin" ON "public"."buyers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "buyers_insert_dealer_or_admin" ON "public"."buyers" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))));



CREATE POLICY "buyers_select_dealer_or_admin" ON "public"."buyers" FOR SELECT TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))));



CREATE POLICY "buyers_update_dealer_or_admin" ON "public"."buyers" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))));



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_delete_admin" ON "public"."employees" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "employees_insert_admin" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "employees_select_auth" ON "public"."employees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "employees_select_own_or_admin" ON "public"."employees" FOR SELECT TO "authenticated" USING ((("account_user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "employees_update_admin" ON "public"."employees" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."inspection_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inspection_items_delete_admin" ON "public"."inspection_items" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "inspection_items_insert_detailer_or_admin" ON "public"."inspection_items" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role"))));



CREATE POLICY "inspection_items_select_active_accounts" ON "public"."inspection_items" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "inspection_items_update_detailer_or_admin" ON "public"."inspection_items" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role"))));



ALTER TABLE "public"."inspections" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inspections_delete_admin" ON "public"."inspections" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "inspections_insert_detailer_or_admin" ON "public"."inspections" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));



CREATE POLICY "inspections_select_active_accounts" ON "public"."inspections" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "inspections_update_detailer_or_admin" ON "public"."inspections" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'detailer'::"public"."employee_role")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));



ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "listings_delete_admin" ON "public"."listings" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "listings_insert_admin" ON "public"."listings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "listings_select_active_accounts" ON "public"."listings" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "listings_update_admin" ON "public"."listings" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."sale_contract_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_admin_select_all" ON "public"."sales" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "sales_delete_admin" ON "public"."sales" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "sales_insert_dealer_or_admin" ON "public"."sales" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")) AND (("dealer_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("dealer_employee_id")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));



CREATE POLICY "sales_select_dealer_or_admin" ON "public"."sales" FOR SELECT TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))));



CREATE POLICY "sales_update_dealer_or_admin" ON "public"."sales" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")) AND (("dealer_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("dealer_employee_id")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));



ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tasks_admin_select_all" ON "public"."tasks" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "tasks_delete_admin" ON "public"."tasks" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "tasks_insert_admin_or_dealer" ON "public"."tasks" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))));



CREATE POLICY "tasks_select_by_role_or_admin" ON "public"."tasks" FOR SELECT TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("assigned_role" = "public"."current_account_role"()))));



CREATE POLICY "tasks_update_claim_or_admin" ON "public"."tasks" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("assigned_role" = "public"."current_account_role"())))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR (("assigned_role" = "public"."current_account_role"()) AND (("assigned_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("assigned_employee_id")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id")) AND (("created_by_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("created_by_employee_id"))))));



ALTER TABLE "public"."vehicle_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicle_events_delete_admin" ON "public"."vehicle_events" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "vehicle_events_insert_admin" ON "public"."vehicle_events" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "vehicle_events_select_admin" ON "public"."vehicle_events" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "vehicle_events_update_admin" ON "public"."vehicle_events" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."vehicle_sale_prep" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicles_admin_select_all" ON "public"."vehicles" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "vehicles_delete_admin_or_dealer" ON "public"."vehicles" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")));



CREATE POLICY "vehicles_insert_admin_or_dealer" ON "public"."vehicles" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")));



CREATE POLICY "vehicles_read_authenticated" ON "public"."vehicles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "vehicles_select_active_accounts" ON "public"."vehicles" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "vehicles_update_admin_or_dealer" ON "public"."vehicles" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")));



CREATE POLICY "vsp_admin_select_all" ON "public"."vehicle_sale_prep" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "vsp_delete_admin" ON "public"."vehicle_sale_prep" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "vsp_insert_dealer_or_admin" ON "public"."vehicle_sale_prep" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")) AND (("dealer_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("dealer_employee_id"))));



CREATE POLICY "vsp_select_active_accounts" ON "public"."vehicle_sale_prep" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "vsp_update_dealer_or_admin" ON "public"."vehicle_sale_prep" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'dealer'::"public"."employee_role")) AND (("dealer_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("dealer_employee_id"))));



ALTER TABLE "public"."workcards" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workcards_delete_admin" ON "public"."workcards" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "workcards_insert_mechanic_or_admin" ON "public"."workcards" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'mechanic'::"public"."employee_role")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));



CREATE POLICY "workcards_select_active_accounts" ON "public"."workcards" FOR SELECT TO "authenticated" USING ("public"."is_active_account"());



CREATE POLICY "workcards_update_mechanic_or_admin" ON "public"."workcards" FOR UPDATE TO "authenticated" USING (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'mechanic'::"public"."employee_role")))) WITH CHECK (("public"."is_active_account"() AND ("public"."is_admin"() OR ("public"."current_account_role"() = 'mechanic'::"public"."employee_role")) AND (("actor_employee_id" IS NULL) OR "public"."employee_belongs_to_current_account"("actor_employee_id"))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_detailer_intake_task_on_vehicle_activated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_listing_create_task_on_vehicle_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_listing_create_task_on_vehicle_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_listing_create_task_on_vehicle_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_listing_photos_task_on_detail_intake_done"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_account_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_account_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_account_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."employee_belongs_to_current_account"("emp_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."employee_belongs_to_current_account"("emp_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."employee_belongs_to_current_account"("emp_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_auth_user_created_app_accounts"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_app_accounts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_app_accounts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."on_auth_user_created_bootstrap"() TO "anon";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_bootstrap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."on_auth_user_created_bootstrap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_sales_contract_generated_create_sale_prep_task"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_tasks_done_cascade"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_tasks_done_cascade"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_tasks_done_cascade"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_vehicle_sale_prep_insert_create_mechanic_task"() TO "service_role";



GRANT ALL ON FUNCTION "public"."try_uuid"("t" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."try_uuid"("t" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."try_uuid"("t" "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."app_account_employees" TO "anon";
GRANT ALL ON TABLE "public"."app_account_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."app_account_employees" TO "service_role";



GRANT ALL ON TABLE "public"."app_accounts" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."app_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."app_accounts" TO "service_role";



GRANT UPDATE("default_employee_id") ON TABLE "public"."app_accounts" TO "authenticated";



GRANT ALL ON TABLE "public"."app_employee_invites" TO "service_role";



GRANT ALL ON TABLE "public"."buyers" TO "anon";
GRANT ALL ON TABLE "public"."buyers" TO "authenticated";
GRANT ALL ON TABLE "public"."buyers" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."inspection_items" TO "anon";
GRANT ALL ON TABLE "public"."inspection_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inspection_items" TO "service_role";



GRANT ALL ON TABLE "public"."inspections" TO "anon";
GRANT ALL ON TABLE "public"."inspections" TO "authenticated";
GRANT ALL ON TABLE "public"."inspections" TO "service_role";



GRANT ALL ON TABLE "public"."listings" TO "anon";
GRANT ALL ON TABLE "public"."listings" TO "authenticated";
GRANT ALL ON TABLE "public"."listings" TO "service_role";



GRANT ALL ON TABLE "public"."sale_contract_details" TO "anon";
GRANT ALL ON TABLE "public"."sale_contract_details" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_contract_details" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_events" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_events" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_events" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_sale_prep" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_sale_prep" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_sale_prep" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."workcards" TO "anon";
GRANT ALL ON TABLE "public"."workcards" TO "authenticated";
GRANT ALL ON TABLE "public"."workcards" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































