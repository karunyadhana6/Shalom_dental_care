/**
 * Supabase Configuration for Shalom Dental Care
 * 
 * This file contains the Supabase connection settings.
 * For production, you should inject these values server-side or use environment variables.
 */

// ============================================================================
// ENVIRONMENT VARIABLE HELPER
// ============================================================================

/**
 * Gets an environment variable from various sources
 * Priority: window globals > process.env > fallback default
 */
function getEnvVar(name, fallback = '') {
    // 1. Check window globals (can be injected by server)
    if (typeof window !== 'undefined' && window[name]) {
        return window[name];
    }
    
    // 2. Check process.env (Node.js / build tools like Webpack, Vite)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
        return process.env[name];
    }
    
    // 3. Return fallback (hardcoded for demo/development)
    return fallback;
}

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================

const supabaseConfig = {
    url: getEnvVar('SUPABASE_URL', 'https://tsjgdptgyvqkmgvagsid.supabase.co'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzamdkcHRneXZxa21ndmFnc2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDQ5OTgsImV4cCI6MjA4MTYyMDk5OH0.p6vHkCaAMZcIXBykPJE0gTnwPrThC0jrtx4fnicmxKE')
};

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

let supabaseClient = null;

// Initialize Supabase client
function initSupabase() {
    if (supabaseClient) return supabaseClient;
    
    // Check if Supabase library is loaded
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase library not loaded. Make sure to include the Supabase CDN script.');
        return null;
    }
    
    // Check if credentials are configured
    if (!supabaseConfig.url || !supabaseConfig.anonKey || 
        supabaseConfig.url === 'YOUR_SUPABASE_URL' || 
        supabaseConfig.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase credentials not configured. Using local storage only.');
        return null;
    }
    
    try {
        supabaseClient = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
        console.log('✅ Supabase client created successfully');
        return supabaseClient;
    } catch (error) {
        console.error('❌ Failed to create Supabase client:', error);
        return null;
    }
}

// Initialize on load
const db = initSupabase();

// ============================================================================
// SUPABASE APPOINTMENT TRACKER (extends base AppointmentTracker)
// ============================================================================

/**
 * SupabaseAppointmentTracker - Extends AppointmentTracker with Supabase cloud storage
 * Automatically syncs appointments to Supabase while maintaining local storage backup
 */
class SupabaseAppointmentTracker extends AppointmentTracker {
    constructor() {
        super();
        this.supabase = db;
        this.useDatabase = !!this.supabase;
        this.tableName = 'appointments';
        
        if (this.useDatabase) {
            console.log('☁️ SupabaseAppointmentTracker initialized with cloud database');
            this.loadFromSupabase();
        } else {
            console.log('📦 SupabaseAppointmentTracker running in local-only mode');
        }
    }
    
    // Load appointments from Supabase
    async loadFromSupabase() {
        if (!this.supabase) return;
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Error loading from Supabase:', error);
                return;
            }
            
            if (data && data.length > 0) {
                // Map Supabase data to local format
                this.appointments = data.map(apt => ({
                    id: apt.id,
                    appointmentId: apt.appointment_id,
                    name: apt.name,
                    phone: apt.phone,
                    email: apt.email,
                    service: apt.service,
                    date: apt.appointment_date,
                    message: apt.message || '',
                    status: apt.status || 'pending',
                    notes: apt.notes || '',
                    createdAt: apt.created_at,
                    updatedAt: apt.updated_at
                }));
                
                // Update nextId
                this.nextId = Math.max(...this.appointments.map(a => a.id), 0) + 1;
                
                console.log(`✅ Loaded ${data.length} appointments from Supabase`);
                
                // Also save to local storage as backup
                this.saveEncryptedAppointments();
                
                // Refresh admin panel if open
                this.refreshAdminPanel();
            }
        } catch (error) {
            console.error('❌ Exception loading from Supabase:', error);
        }
    }
    
    // Override addAppointment to save to Supabase
    async addAppointment(appointmentData) {
        const appointmentId = this.generateAppointmentId();
        
        const appointment = {
            id: this.nextId++,
            appointmentId: appointmentId,
            ...appointmentData,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Add to local array first
        this.appointments.push(appointment);
        this.saveEncryptedAppointments();
        
        // Save to Supabase if connected
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from(this.tableName)
                    .insert({
                        appointment_id: appointmentId,
                        name: appointmentData.name,
                        phone: appointmentData.phone,
                        email: appointmentData.email,
                        service: appointmentData.service,
                        appointment_date: appointmentData.date,
                        message: appointmentData.message || '',
                        status: 'pending'
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ Error saving to Supabase:', error);
                    this.showNotification('Saved locally (cloud sync failed)', 'warning');
                } else {
                    console.log('✅ Appointment saved to Supabase:', data);
                    // Update local appointment with Supabase ID
                    appointment.id = data.id;
                    this.saveEncryptedAppointments();
                }
            } catch (error) {
                console.error('❌ Exception saving to Supabase:', error);
            }
        }
        
        this.notifyAdmin(appointment);
        return appointment;
    }
    
    // Override updateAppointmentStatus to sync with Supabase
    async updateAppointmentStatus(id, status, notes = '') {
        // Call parent method for local update
        const appointment = this.appointments.find(a => a.id === id);
        if (!appointment) return;
        
        const oldStatus = appointment.status;
        appointment.status = status;
        appointment.notes = notes;
        appointment.updatedAt = new Date().toISOString();
        
        this.saveEncryptedAppointments();
        
        // Sync to Supabase
        if (this.supabase) {
            try {
                const { error } = await this.supabase
                    .from(this.tableName)
                    .update({
                        status: status,
                        notes: notes,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', id);
                
                if (error) {
                    console.error('❌ Error updating Supabase:', error);
                } else {
                    console.log('✅ Status updated in Supabase');
                }
            } catch (error) {
                console.error('❌ Exception updating Supabase:', error);
            }
        }
        
        this.refreshAdminPanel();
        this.showNotification(`Appointment status updated to ${status}`, 'success');
        
        if (status === 'confirmed') {
            this.sendEmailNotification(appointment, 'confirmed');
        }
    }
    
    // Sync local data to Supabase
    async syncLocalToSupabase() {
        if (!this.supabase) {
            this.showNotification('Supabase not connected', 'error');
            return;
        }
        
        this.showNotification('Syncing to cloud...', 'info');
        
        let synced = 0;
        let errors = 0;
        
        for (const appointment of this.appointments) {
            try {
                // Check if exists in Supabase
                const { data: existing } = await this.supabase
                    .from(this.tableName)
                    .select('id')
                    .eq('appointment_id', appointment.appointmentId)
                    .maybeSingle();
                
                if (existing) {
                    // Update existing
                    await this.supabase
                        .from(this.tableName)
                        .update({
                            name: appointment.name,
                            phone: appointment.phone,
                            email: appointment.email,
                            service: appointment.service,
                            appointment_date: appointment.date,
                            message: appointment.message || '',
                            status: appointment.status,
                            notes: appointment.notes || '',
                            updated_at: appointment.updatedAt
                        })
                        .eq('id', existing.id);
                } else {
                    // Insert new
                    await this.supabase
                        .from(this.tableName)
                        .insert({
                            appointment_id: appointment.appointmentId,
                            name: appointment.name,
                            phone: appointment.phone,
                            email: appointment.email,
                            service: appointment.service,
                            appointment_date: appointment.date,
                            message: appointment.message || '',
                            status: appointment.status,
                            notes: appointment.notes || ''
                        });
                }
                synced++;
            } catch (error) {
                console.error('Sync error for appointment:', appointment.appointmentId, error);
                errors++;
            }
        }
        
        if (errors === 0) {
            this.showNotification(`✅ Synced ${synced} appointments to cloud`, 'success');
        } else {
            this.showNotification(`Synced ${synced}, failed ${errors}`, 'warning');
        }
    }
}

// ============================================================================
// SUPABASE FEEDBACK MANAGER
// ============================================================================

/**
 * SupabaseFeedbackManager - Handles feedback/testimonials storage in Supabase
 */
class SupabaseFeedbackManager {
    constructor() {
        this.supabase = db;
        this.tableName = 'feedback';
        this.isConnected = !!this.supabase;
    }
    
    // Save feedback to Supabase
    async saveFeedback(feedbackData) {
        if (!this.supabase) {
            console.warn('⚠️ Supabase not connected, cannot save feedback to cloud');
            return null;
        }
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert({
                    appointment_id: feedbackData.appointmentId || null,
                    patient_name: feedbackData.patientName,
                    phone: feedbackData.phone || null,
                    service: feedbackData.service || 'General',
                    appointment_date: feedbackData.appointmentDate || null,
                    rating: feedbackData.rating,
                    categories: feedbackData.categories || [],
                    comments: feedbackData.comments || '',
                    recommend: feedbackData.recommend || null,
                    source: feedbackData.source || 'in-clinic',
                    internal_notes: feedbackData.internalNotes || '',
                    show_on_homepage: feedbackData.showOnHomepage || false,
                    created_by: feedbackData.createdBy || 'Admin'
                })
                .select()
                .single();
            
            if (error) {
                console.error('❌ Error saving feedback to Supabase:', error);
                return null;
            }
            
            console.log('✅ Feedback saved to Supabase:', data);
            return data;
        } catch (error) {
            console.error('❌ Exception saving feedback:', error);
            return null;
        }
    }
    
    // Load testimonials for homepage (only approved ones with high ratings)
    async loadHomepageTestimonials() {
        if (!this.supabase) {
            console.warn('⚠️ Supabase not connected, cannot load testimonials from cloud');
            return [];
        }
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('show_on_homepage', true)
                .gte('rating', 4)
                .order('rating', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(6);
            
            if (error) {
                console.error('❌ Error loading testimonials:', error);
                return [];
            }
            
            // Map to expected format
            return (data || []).map(fb => ({
                patientName: fb.patient_name,
                service: fb.service,
                rating: fb.rating,
                comments: fb.comments,
                createdAt: fb.created_at
            }));
        } catch (error) {
            console.error('❌ Exception loading testimonials:', error);
            return [];
        }
    }
    
    // Load all feedback for admin
    async loadAllFeedback() {
        if (!this.supabase) return [];
        
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ Error loading all feedback:', error);
                return [];
            }
            
            return data || [];
        } catch (error) {
            console.error('❌ Exception loading feedback:', error);
            return [];
        }
    }
}

// ============================================================================
// EXPORTS (for module environments) / GLOBALS (for browser)
// ============================================================================

// Make classes available globally for non-module scripts
if (typeof window !== 'undefined') {
    window.SupabaseAppointmentTracker = SupabaseAppointmentTracker;
    window.SupabaseFeedbackManager = SupabaseFeedbackManager;
    window.supabaseClient = db;
    window.supabaseConfig = supabaseConfig;
}

console.log('📦 Supabase config loaded');
console.log('🔗 Supabase URL:', supabaseConfig.url);
console.log('🔌 Supabase connected:', !!db);