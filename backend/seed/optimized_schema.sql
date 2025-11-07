-- =====================================================
-- NEXTSTEP MENTORSHIP BOT - OPTIMIZED DATABASE SCHEMA
-- Designed for millions of records with unlimited scalability
-- =====================================================

-- Enable required extensions for performance
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =====================================================
-- CORE TABLES WITH OPTIMIZED STRUCTURE
-- =====================================================

-- Counselors table with UUID for better distribution
CREATE TABLE IF NOT EXISTS counselors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  department VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Students table with optimized indexing (keeping for backward compatibility)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  admission_no VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  year_of_study INTEGER NOT NULL CHECK (year_of_study >= 1 AND year_of_study <= 6),
  course VARCHAR(100),
  department VARCHAR(100),
  telegram_user_id BIGINT UNIQUE,
  telegram_username VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Clients table for international therapy services
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  contact_info VARCHAR(255) NOT NULL, -- phone or email
  emergency_contact_name VARCHAR(255) NOT NULL,
  emergency_contact_phone VARCHAR(20) NOT NULL,
  therapy_reason TEXT,
  session_goals TEXT,
  previous_therapy BOOLEAN DEFAULT FALSE,
  telegram_user_id BIGINT UNIQUE,
  telegram_username VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Telegram user sessions table for bot (if missing)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_user_id BIGINT UNIQUE NOT NULL,
  telegram_username VARCHAR(100),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PARTITIONED TABLES FOR SCALABILITY
-- =====================================================

-- Appointments table with monthly partitioning (supports both students and clients)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  -- legacy columns used by code paths
  start_ts TIMESTAMP WITH TIME ZONE,
  end_ts TIMESTAMP WITH TIME ZONE,
  -- newer fields
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  session_type VARCHAR(50) DEFAULT 'in-person' CHECK (session_type IN ('in-person', 'online (video)', 'phone')),
  session_duration VARCHAR(20) DEFAULT '60 mins' CHECK (session_duration IN ('45 mins', '60 mins', '90 mins')),
  payment_method VARCHAR(50) CHECK (payment_method IN ('M-Pesa', 'Card', 'Cash', 'Insurance')),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  amount_cents INTEGER DEFAULT 0 CHECK (amount_cents >= 0),
  status VARCHAR(20) DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'canceled', 'completed', 'no_show')),
  notes TEXT,
  meeting_link VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES counselors(id),
  updated_by UUID REFERENCES counselors(id),
  CONSTRAINT check_client_or_student CHECK (
    (student_id IS NOT NULL AND client_id IS NULL) OR 
    (student_id IS NULL AND client_id IS NOT NULL)
  )
) PARTITION BY RANGE (appointment_date);

-- Create partitions for appointments (current year + next year)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..23 LOOP
        start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::interval;
        end_date := start_date + '1 month'::interval;
        partition_name := 'appointments_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF appointments FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Announcements table with yearly partitioning
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID REFERENCES counselors(id) ON DELETE SET NULL,
  title VARCHAR(255),
  message TEXT NOT NULL,
  is_force BOOLEAN DEFAULT false,
  target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'students', 'counselors')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
) PARTITION BY RANGE (created_at);

-- Create partitions for announcements (current year + next year)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..1 LOOP
        start_date := date_trunc('year', CURRENT_DATE) + (i || ' years')::interval;
        end_date := start_date + '1 year'::interval;
        partition_name := 'announcements_' || to_char(start_date, 'YYYY');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF announcements FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  activity_time TIME NOT NULL,
  location VARCHAR(255),
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Books table
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID REFERENCES counselors(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  isbn VARCHAR(20),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  pickup_station VARCHAR(255),
  condition VARCHAR(50) DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  is_sold BOOLEAN DEFAULT false,
  sold_to UUID REFERENCES students(id),
  sold_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Absence days table
CREATE TABLE IF NOT EXISTS absence_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID REFERENCES counselors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Peer applicants table
CREATE TABLE IF NOT EXISTS peer_applicants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  application_data JSONB,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_by UUID REFERENCES counselors(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Counselor slots table with partitioning
CREATE TABLE IF NOT EXISTS counselor_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  counselor_id UUID NOT NULL REFERENCES counselors(id) ON DELETE CASCADE,
  start_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  end_ts TIMESTAMP WITH TIME ZONE NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  appointment_id UUID REFERENCES appointments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
) PARTITION BY RANGE (start_ts);

-- Create partitions for counselor slots (current year + next year)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..23 LOOP
        start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::interval;
        end_date := start_date + '1 month'::interval;
        partition_name := 'counselor_slots_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF counselor_slots FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
    END LOOP;
END $$;

-- =====================================================
-- AUDIT AND LOGGING TABLES
-- =====================================================

-- System logs table for monitoring and debugging
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  message TEXT NOT NULL,
  context JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions for system logs (monthly)
DO $$
DECLARE
    start_date DATE;
    end_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE) + (i || ' months')::interval;
        end_date := start_date + '1 month'::interval;
        partition_name := 'system_logs_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF system_logs FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
    END LOOP;
END $$;

-- =====================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =====================================================

-- Counselors indexes
CREATE INDEX IF NOT EXISTS idx_counselors_email ON counselors(email);
CREATE INDEX IF NOT EXISTS idx_counselors_department ON counselors(department);
CREATE INDEX IF NOT EXISTS idx_counselors_active ON counselors(is_active);
CREATE INDEX IF NOT EXISTS idx_counselors_created_at ON counselors(created_at);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_admission_no ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_telegram_user_id ON students(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_students_year_of_study ON students(year_of_study);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_contact_info ON clients(contact_info);
CREATE INDEX IF NOT EXISTS idx_clients_telegram_user_id ON clients(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_date_of_birth ON clients(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_previous_therapy ON clients(previous_therapy);

-- Appointments indexes (these will be created on each partition automatically)
CREATE INDEX IF NOT EXISTS idx_appointments_student_id ON appointments(student_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_counselor_id ON appointments(counselor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status ON appointments(payment_status);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_method ON appointments(payment_method);
CREATE INDEX IF NOT EXISTS idx_appointments_session_type ON appointments(session_type);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_appointments_counselor_status ON appointments(counselor_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_student_status ON appointments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_client_status ON appointments(client_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_counselor_date ON appointments(counselor_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status_method ON appointments(payment_status, payment_method);

-- Announcements indexes
CREATE INDEX IF NOT EXISTS idx_announcements_counselor_id ON announcements(counselor_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_target_audience ON announcements(target_audience);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);

-- Notifications table for bot reminders
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  telegram_user_id BIGINT,
  notification_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled_for ON notifications(scheduled_for);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_counselor_id ON activities(counselor_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_date_time ON activities(activity_date, activity_time);

-- Books indexes
CREATE INDEX IF NOT EXISTS idx_books_counselor_id ON books(counselor_id);
CREATE INDEX IF NOT EXISTS idx_books_sold ON books(is_sold);
CREATE INDEX IF NOT EXISTS idx_books_price ON books(price_cents);
CREATE INDEX IF NOT EXISTS idx_books_title_gin ON books USING gin(to_tsvector('english', title));

-- Counselor slots indexes
CREATE INDEX IF NOT EXISTS idx_counselor_slots_counselor_id ON counselor_slots(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_slots_start_ts ON counselor_slots(start_ts);
CREATE INDEX IF NOT EXISTS idx_counselor_slots_booked ON counselor_slots(is_booked);
CREATE INDEX IF NOT EXISTS idx_counselor_slots_counselor_start ON counselor_slots(counselor_id, start_ts);

-- System logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_counselors_updated_at
    BEFORE UPDATE ON counselors
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_peer_applicants_updated_at
    BEFORE UPDATE ON peer_applicants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_counselor_slots_updated_at
    BEFORE UPDATE ON counselor_slots
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- =====================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- =====================================================

-- Set work_mem for better performance (adjust based on your server)
-- ALTER SYSTEM SET work_mem = '256MB';
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET default_statistics_target = 100;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Dashboard statistics view
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM counselors WHERE is_active = true) as total_counselors,
    (SELECT COUNT(*) FROM students WHERE is_active = true) as total_students,
    (SELECT COUNT(*) FROM appointments WHERE status = 'confirmed' AND start_ts >= CURRENT_DATE) as upcoming_appointments,
    (SELECT COUNT(*) FROM appointments WHERE status = 'pending') as pending_appointments,
    (SELECT COUNT(*) FROM announcements WHERE is_active = true AND created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_announcements,
    (SELECT COUNT(*) FROM books WHERE is_sold = false) as available_books;

-- Recent activity view
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'appointment' as type,
    id::text as activity_id,
    counselor_id,
    student_id,
    'Appointment scheduled' as description,
    created_at
FROM appointments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'announcement' as type,
    id::text as activity_id,
    counselor_id,
    NULL::uuid as student_id,
    'Announcement posted' as description,
    created_at
FROM announcements
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT 
    'book' as type,
    id::text as activity_id,
    counselor_id,
    NULL::uuid as student_id,
    'Book added' as description,
    created_at
FROM books
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

ORDER BY created_at DESC;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample counselor
INSERT INTO counselors (id, name, email, password_hash, is_admin) 
VALUES (
    uuid_generate_v4(),
    'Admin Counselor',
    'admin@maseno.ac.ke',
    '$2b$10$rQZ8K9vX7wE2nF1mP3sL6uY4cD5eR7gH9iJ0kL2mN4oP6qR8sT0uV2wX4yZ6',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert sample student
INSERT INTO students (id, name, admission_no, phone, year_of_study, course, department) 
VALUES (
    uuid_generate_v4(),
    'John Doe',
    'MAS/2024/001',
    '+254712345678',
    1,
    'Computer Science',
    'School of Computing'
) ON CONFLICT (admission_no) DO NOTHING;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Function to create new partitions automatically
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name TEXT, start_date DATE, months_ahead INTEGER DEFAULT 12)
RETURNS VOID AS $$
DECLARE
    i INTEGER;
    partition_date DATE;
    partition_name TEXT;
    end_date DATE;
BEGIN
    FOR i IN 0..months_ahead-1 LOOP
        partition_date := start_date + (i || ' months')::interval;
        end_date := partition_date + '1 month'::interval;
        partition_name := table_name || '_' || to_char(partition_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                      partition_name, table_name, partition_date, end_date);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to drop old partitions
CREATE OR REPLACE FUNCTION drop_old_partitions(table_name TEXT, months_to_keep INTEGER DEFAULT 24)
RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (months_to_keep || ' months')::interval;
    
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE tablename LIKE table_name || '_%' 
        AND schemaname = 'public'
    LOOP
        -- Extract date from partition name and drop if older than cutoff
        IF partition_record.tablename ~ ('^' || table_name || '_\d{4}_\d{2}$') THEN
            DECLARE
                partition_date DATE;
            BEGIN
                partition_date := to_date(
                    substring(partition_record.tablename from '_\d{4}_\d{2}$'), 
                    '_YYYY_MM'
                );
                
                IF partition_date < cutoff_date THEN
                    EXECUTE 'DROP TABLE IF EXISTS ' || partition_record.tablename;
                END IF;
            END;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================

-- Grant necessary permissions (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

COMMIT;
