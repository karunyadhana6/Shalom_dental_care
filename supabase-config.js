// Supabase Configuration for Shalom Dental Care
// Complete cloud database solution with real-time updates

// =============================================================================
// ENVIRONMENT VARIABLES SETUP
// =============================================================================
// For production deployments, use one of these methods to inject credentials:
//
// METHOD 1: Build-time injection (Vite, Webpack, etc.)
// - Create a .env file (see .env.example)
// - Use import.meta.env.VITE_SUPABASE_URL or process.env.SUPABASE_URL
//
// METHOD 2: Server-side injection
// - Inject credentials via server-rendered template variables
// - Example: <script>window.SUPABASE_URL = '<?= env("SUPABASE_URL") ?>'</script>
//
// METHOD 3: Configuration endpoint
// - Fetch configuration from a secure server endpoint on page load
//
// SECURITY NOTE:
// The anon/public key is designed for client-side use and is protected by
// Row Level Security (RLS) policies. However, avoid committing credentials
// directly to version control. Use the .env.example pattern instead.
// =============================================================================

// Check for environment variables (injected at build time or via server)
const getEnvVar = (name, fallback = '') => {
    // Check window globals (server-side injection)
    if (typeof window !== 'undefined' && window[name]) {
        return window[name];
    }
    // Check process.env (Node.js / build tools)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
        return process.env[name];
    }
    // Check import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[`VITE_${name}`]) {
        return import.meta.env[`VITE_${name}`];
    }
    return fallback;
};

const supabaseConfig = {
    // Supabase Project URL
    // For local development, these fallback values are used
    // In production, inject via environment variables or remove fallbacks
    url: getEnvVar('SUPABASE_URL', 'https://tsjgdptgyvqkmgvagsid.supabase.co'),
    
    // Supabase anon/public key (safe for frontend, protected by RLS)
    anonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzamdkcHRneXZxa21ndmFnc2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDQ5OTgsImV4cCI6MjA4MTYyMDk5OH0.p6vHkCaAMZcIXBykPJE0gTnwPrThC0jrtx4fnicmxKE')
};

// SQL to create the appointments table in Supabase:
/*
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  appointment_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  service VARCHAR(100) NOT NULL,
  appointment_date DATE NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on appointments" ON appointments FOR ALL USING (true);

-- ==================== BILLING TABLE ====================
-- Stores billing calculator data and generated bill records

CREATE TABLE billing (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  bill_number VARCHAR(20) UNIQUE,
  consultant_fee DECIMAL(10,2) DEFAULT 0,
  lab_fee DECIMAL(10,2) DEFAULT 0,
  clinic_fee DECIMAL(10,2) DEFAULT 0,
  total_fee DECIMAL(10,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  grand_total DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'cash',
  payment_status VARCHAR(20) DEFAULT 'pending',
  bill_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  bill_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on billing" ON billing FOR ALL USING (true);

-- Index for faster lookups
CREATE INDEX idx_billing_appointment_id ON billing(appointment_id);
CREATE INDEX idx_billing_bill_number ON billing(bill_number);
CREATE INDEX idx_billing_payment_status ON billing(payment_status);

-- ==================== FEEDBACK / REVIEWS TABLE ====================
-- Stores patient feedback and reviews (shown on homepage)

CREATE TABLE feedback (
  id SERIAL PRIMARY KEY,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  patient_name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  service VARCHAR(100) DEFAULT 'General',
  appointment_date DATE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  categories TEXT[] DEFAULT '{}',
  comments TEXT,
  recommend VARCHAR(20),
  source VARCHAR(30) DEFAULT 'in-clinic',
  internal_notes TEXT,
  show_on_homepage BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(50) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations
CREATE POLICY "Allow all operations on feedback" ON feedback FOR ALL USING (true);

-- Index for faster lookups
CREATE INDEX idx_feedback_show_on_homepage ON feedback(show_on_homepage);
CREATE INDEX idx_feedback_rating ON feedback(rating);
*/

// Import Supabase client (add this script tag to your HTML)
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Global Supabase client variable
let supabaseClient = null;

// Check if Supabase is loaded
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded. Please include the Supabase CDN script.');
} else {
    const { createClient } = supabase;
    
    // Only create client if credentials are configured
    if (supabaseConfig.url !== 'your-supabase-url-here' && 
        supabaseConfig.anonKey !== 'your-supabase-anon-key-here') {
        try {
            supabaseClient = createClient(supabaseConfig.url, supabaseConfig.anonKey);
            console.log('✅ Supabase client created successfully');
        } catch (error) {
            console.error('Failed to create Supabase client:', error);
        }
    } else {
        console.warn('⚠️ Supabase credentials not configured');
    }
}

// Supabase Database Integration for Appointment Tracker
class SupabaseAppointmentTracker extends AppointmentTracker {
    constructor() {
        super();
        this.supabase = supabaseClient;
        this.useDatabase = !!supabaseClient; // Only use if client is available
        this.tableName = 'appointments';
        
        console.log('SupabaseAppointmentTracker constructor - useDatabase:', this.useDatabase);
        
        if (this.supabase) {
            this.initializeSupabase();
        } else {
            console.warn('Supabase client not available, falling back to local storage');
            this.showNotification('Using local storage - Supabase not configured', 'warning');
            this.updateSupabaseStatus('Not Configured', 'error');
        }
    }

    async initializeSupabase() {
        try {
            // Check if credentials are properly configured
            if (supabaseConfig.url === 'your-supabase-url-here' || 
                supabaseConfig.anonKey === 'your-supabase-anon-key-here') {
                throw new Error('Please configure your Supabase credentials in supabase-config.js');
            }

            // Test connection and load initial data
            await this.loadAppointmentsFromSupabase();
            this.setupRealTimeSubscription();
            // Connection successful - no notification shown to avoid clutter
            this.updateSupabaseStatus('Connected', 'success');
        } catch (error) {
            console.error('Supabase initialization failed:', error);
            // Only show error notifications, not success ones
            this.updateSupabaseStatus('Offline (Local Storage)', 'error');
            this.useDatabase = false;
        }
    }

    // Update Supabase status indicator
    updateSupabaseStatus(statusText, statusType) {
        const statusElement = document.getElementById('supabase-status');
        if (statusElement) {
            statusElement.textContent = statusText;
            const statusContainer = statusElement.parentElement;
            
            if (statusType === 'success') {
                statusContainer.style.background = 'var(--accent-green)';
                statusContainer.querySelector('i').className = 'fas fa-cloud-check';
            } else if (statusType === 'error') {
                statusContainer.style.background = '#ef4444';
                statusContainer.querySelector('i').className = 'fas fa-cloud-exclamation';
            } else {
                statusContainer.style.background = 'var(--medium-gray)';
                statusContainer.querySelector('i').className = 'fas fa-cloud';
            }
        }
    }

    // Setup real-time subscription for live updates
    setupRealTimeSubscription() {
        this.supabase
            .channel('appointments')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: this.tableName 
                }, 
                (payload) => {
                    console.log('Real-time update:', payload);
                    this.handleRealTimeUpdate(payload);
                }
            )
            .subscribe();
    }

    // Handle real-time updates
    handleRealTimeUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
            case 'INSERT':
                // Don't add if it's our own insert
                if (!this.appointments.find(a => a.id === newRecord.id)) {
                    this.appointments.push(newRecord);
                    this.refreshAdminPanel();
                    this.showNotification('New appointment received! 📅', 'info');
                }
                break;
                
            case 'UPDATE':
                const updateIndex = this.appointments.findIndex(a => a.id === newRecord.id);
                if (updateIndex !== -1) {
                    this.appointments[updateIndex] = newRecord;
                    this.refreshAdminPanel();
                    this.showNotification('Appointment updated! ✅', 'info');
                }
                break;
                
            case 'DELETE':
                this.appointments = this.appointments.filter(a => a.id !== oldRecord.id);
                this.refreshAdminPanel();
                this.showNotification('Appointment deleted! 🗑️', 'info');
                break;
        }
    }

    // Load appointments from Supabase
    async loadAppointmentsFromSupabase() {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.appointments = data || [];
            this.nextId = this.appointments.length > 0 ? Math.max(...this.appointments.map(a => a.id || 0)) + 1 : 1;
            
            return this.appointments;
        } catch (error) {
            console.error('Error loading appointments from Supabase:', error);
            throw error;
        }
    }

    // Save appointment to Supabase
    async saveAppointmentToSupabase(appointment) {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert([appointment])
                .select()
                .single();

            if (error) throw error;

            console.log("Appointment saved to Supabase:", data);
            return data;
        } catch (error) {
            console.error("Error adding appointment to Supabase:", error);
            throw error;
        }
    }

    // Update appointment in Supabase
    async updateAppointmentInSupabase(appointmentId, updates) {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            console.log("Appointment updated in Supabase:", data);
            return data;
        } catch (error) {
            console.error("Error updating appointment in Supabase:", error);
            throw error;
        }
    }

    // Delete appointment from Supabase
    async deleteAppointmentFromSupabase(appointmentId) {
        try {
            const { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('id', appointmentId);

            if (error) throw error;

            console.log("Appointment deleted from Supabase");
        } catch (error) {
            console.error("Error deleting appointment from Supabase:", error);
            throw error;
        }
    }

    // Override addAppointment to use Supabase
    async addAppointment(appointmentData) {
        console.log('SupabaseAppointmentTracker.addAppointment called with:', appointmentData);
        console.log('useDatabase:', this.useDatabase);
        console.log('supabase client available:', !!this.supabase);
        
        const generatedId = this.generateAppointmentId();
        
        const appointment = {
            appointment_id: generatedId,
            name: appointmentData.name,
            phone: appointmentData.phone,
            email: appointmentData.email,
            service: appointmentData.service,
            appointment_date: appointmentData.date,
            message: appointmentData.message || '',
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (this.useDatabase && this.supabase) {
            try {
                console.log('Saving appointment to Supabase...', appointment);
                const savedAppointment = await this.saveAppointmentToSupabase(appointment);
                
                console.log('Successfully saved to Supabase:', savedAppointment);
                
                // Add camelCase appointmentId for compatibility with the UI
                savedAppointment.appointmentId = savedAppointment.appointment_id;
                savedAppointment.date = savedAppointment.appointment_date;
                
                // Update local array
                this.appointments.unshift(savedAppointment);
                this.refreshAdminPanel();
                // Success notification hidden - user sees the modal instead
                
                this.notifyAdmin(savedAppointment);
                return savedAppointment;
                
            } catch (error) {
                console.error('Supabase save failed:', error);
                this.showNotification('Cloud save failed, saving locally instead', 'error');
                
                // Fallback to local storage
                appointment.id = this.nextId++;
                appointment.appointmentId = generatedId; // Add camelCase version
                appointment.date = appointmentData.date;
                this.appointments.unshift(appointment);
                this.saveEncryptedAppointments();
                this.notifyAdmin(appointment);
                return appointment;
            }
        } else {
            console.log('Database not available, saving locally...');
            // Local storage fallback
            appointment.id = this.nextId++;
            appointment.appointmentId = generatedId; // Add camelCase version
            appointment.date = appointmentData.date;
            this.appointments.unshift(appointment);
            this.saveAppointments();
            this.notifyAdmin(appointment);
            return appointment;
        }
    }

    // Override updateAppointmentStatus to use Supabase
    async updateAppointmentStatus(id, status, notes = '') {
        if (!this.isSessionValid()) {
            this.showNotification('Session expired. Please login again.', 'error');
            this.logoutAdmin();
            return;
        }

        const appointment = this.appointments.find(a => a.id === id);
        if (!appointment) return;

        const oldStatus = appointment.status;
        const updates = {
            status: status,
            notes: notes,
            updated_at: new Date().toISOString()
        };

        if (this.useDatabase) {
            try {
                const updatedAppointment = await this.updateAppointmentInSupabase(id, updates);
                
                // Update local array
                const index = this.appointments.findIndex(a => a.id === id);
                if (index !== -1) {
                    this.appointments[index] = updatedAppointment;
                }
                
                this.logAdminActivity(`Changed appointment ${appointment.appointment_id} status from ${oldStatus} to ${status}`);
                this.refreshAdminPanel();
                
                if (status === 'confirmed') {
                    this.sendEmailNotification(updatedAppointment, 'confirmed');
                }
                
                this.showNotification(`Appointment status updated to ${status}! 🔄`, 'success');
                
            } catch (error) {
                console.error('Supabase update failed:', error);
                this.showNotification('Update failed, please try again', 'error');
            }
        } else {
            // Local storage fallback
            Object.assign(appointment, updates);
            this.saveAppointments();
            this.refreshAdminPanel();
            this.showNotification(`Appointment status updated to ${status}`, 'success');
        }
    }

    // Get appointment analytics from Supabase
    async getSupabaseAnalytics() {
        if (!this.useDatabase) return this.getAnalytics();

        try {
            // Get total counts by status
            const { data: statusCounts } = await this.supabase
                .from(this.tableName)
                .select('status, count(*)', { count: 'exact' })
                .group('status');

            // Get appointments from last 30 days
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const { data: recentAppointments } = await this.supabase
                .from(this.tableName)
                .select('*', { count: 'exact' })
                .gte('created_at', thirtyDaysAgo);

            // Get service popularity
            const { data: serviceCounts } = await this.supabase
                .from(this.tableName)
                .select('service, count(*)', { count: 'exact' })
                .group('service')
                .order('count', { ascending: false })
                .limit(5);

            return {
                totalAppointments: this.appointments.length,
                statusBreakdown: statusCounts || [],
                recentAppointments: recentAppointments?.length || 0,
                popularServices: serviceCounts || [],
                lastSync: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting Supabase analytics:', error);
            return this.getAnalytics(); // Fallback to local analytics
        }
    }

    // Sync local data to Supabase (migration helper)
    async syncLocalToSupabase() {
        if (!this.useDatabase) return;

        const localAppointments = this.loadEncryptedAppointments();
        if (localAppointments.length === 0) return;

        try {
            for (const appointment of localAppointments) {
                // Check if appointment already exists
                const { data: existing } = await this.supabase
                    .from(this.tableName)
                    .select('id')
                    .eq('appointment_id', appointment.appointmentId)
                    .single();

                if (!existing) {
                    // Convert local format to Supabase format
                    const supabaseAppointment = {
                        appointment_id: appointment.appointmentId,
                        name: appointment.name,
                        phone: appointment.phone,
                        email: appointment.email,
                        service: appointment.service,
                        appointment_date: appointment.date,
                        message: appointment.message || '',
                        status: appointment.status,
                        created_at: appointment.createdAt,
                        updated_at: appointment.updatedAt
                    };

                    await this.saveAppointmentToSupabase(supabaseAppointment);
                }
            }

            this.showNotification('Local data synced to Supabase! 🔄', 'success');
            await this.loadAppointmentsFromSupabase();

        } catch (error) {
            console.error('Sync failed:', error);
            this.showNotification('Sync failed, please try again', 'error');
        }
    }

    // Enhanced search with Supabase full-text search
    async searchAppointmentsSupabase(query) {
        if (!this.useDatabase || !query) return this.searchAppointments(query);

        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,appointment_id.ilike.%${query}%`)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];

        } catch (error) {
            console.error('Supabase search failed:', error);
            return this.searchAppointments(query); // Fallback to local search
        }
    }
}

// ==================== Supabase Feedback Manager ====================
// Handles saving/loading feedback to/from Supabase for cross-device persistence

class SupabaseFeedbackManager {
    constructor() {
        this.supabase = supabaseClient;
        this.tableName = 'feedback';
        this.isConnected = !!supabaseClient;
    }

    // Save feedback to Supabase
    async saveFeedback(feedback) {
        if (!this.isConnected) return null;

        try {
            const supabaseFeedback = {
                appointment_id: feedback.appointmentId ? parseInt(feedback.appointmentId) : null,
                patient_name: feedback.patientName,
                phone: feedback.phone || '',
                service: feedback.service || 'General',
                appointment_date: feedback.appointmentDate || null,
                rating: feedback.rating,
                categories: feedback.categories || [],
                comments: feedback.comments || '',
                recommend: feedback.recommend || '',
                source: feedback.source || 'in-clinic',
                internal_notes: feedback.internalNotes || '',
                show_on_homepage: feedback.showOnHomepage || false,
                created_by: feedback.createdBy || 'Admin',
                created_at: feedback.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Remove null appointment_id if not a valid integer
            if (!supabaseFeedback.appointment_id || isNaN(supabaseFeedback.appointment_id)) {
                delete supabaseFeedback.appointment_id;
            }

            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert([supabaseFeedback])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Feedback saved to Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Error saving feedback to Supabase:', error);
            return null;
        }
    }

    // Load all feedback from Supabase
    async loadAllFeedback() {
        if (!this.isConnected) return [];

        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} feedback entries from Supabase`);
            return data || [];
        } catch (error) {
            console.error('❌ Error loading feedback from Supabase:', error);
            return [];
        }
    }

    // Load only homepage testimonials from Supabase
    async loadHomepageTestimonials() {
        if (!this.isConnected) return [];

        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('show_on_homepage', true)
                .gte('rating', 4)
                .neq('comments', '')
                .order('rating', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(6);

            if (error) throw error;

            console.log(`✅ Loaded ${data.length} homepage testimonials from Supabase`);

            // Convert Supabase format to homepage format
            return data.map(fb => ({
                id: fb.id,
                patientName: fb.patient_name,
                service: fb.service,
                rating: fb.rating,
                comments: fb.comments,
                showOnHomepage: fb.show_on_homepage,
                createdAt: fb.created_at
            }));
        } catch (error) {
            console.error('❌ Error loading homepage testimonials from Supabase:', error);
            return [];
        }
    }

    // Delete feedback from Supabase
    async deleteFeedback(feedbackId) {
        if (!this.isConnected) return false;

        try {
            const { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('id', feedbackId);

            if (error) throw error;

            console.log('✅ Feedback deleted from Supabase');
            return true;
        } catch (error) {
            console.error('❌ Error deleting feedback from Supabase:', error);
            return false;
        }
    }

    // Update feedback in Supabase
    async updateFeedback(feedbackId, updates) {
        if (!this.isConnected) return null;

        try {
            const supabaseUpdates = {};
            if (updates.showOnHomepage !== undefined) supabaseUpdates.show_on_homepage = updates.showOnHomepage;
            if (updates.rating !== undefined) supabaseUpdates.rating = updates.rating;
            if (updates.comments !== undefined) supabaseUpdates.comments = updates.comments;
            if (updates.internalNotes !== undefined) supabaseUpdates.internal_notes = updates.internalNotes;
            supabaseUpdates.updated_at = new Date().toISOString();

            const { data, error } = await this.supabase
                .from(this.tableName)
                .update(supabaseUpdates)
                .eq('id', feedbackId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Feedback updated in Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Error updating feedback in Supabase:', error);
            return null;
        }
    }

    // Sync local feedback to Supabase (migration)
    async syncLocalToSupabase(localFeedbackList) {
        if (!this.isConnected || !localFeedbackList || localFeedbackList.length === 0) return 0;

        let synced = 0;
        for (const feedback of localFeedbackList) {
            const result = await this.saveFeedback(feedback);
            if (result) synced++;
        }

        console.log(`✅ Synced ${synced}/${localFeedbackList.length} feedback entries to Supabase`);
        return synced;
    }
}

// Export feedback manager
window.SupabaseFeedbackManager = SupabaseFeedbackManager;

// Export for use in main application
window.SupabaseAppointmentTracker = SupabaseAppointmentTracker;
