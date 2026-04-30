# Database Schema
## Tire Shop Management System

PostgreSQL schema with 18 core tables for complete system functionality.

---

## Database Design Principles

1. **Normalization**: 3NF to avoid data redundancy
2. **Indexing**: Strategic indexes on frequently queried columns
3. **Foreign Keys**: Referential integrity constraints
4. **Audit Trail**: Track creation/modification for compliance
5. **Soft Deletes**: Keep historical data for 7-year retention
6. **Partitioning**: Large tables partitioned by date for performance

---

## Entity Relationship Diagram (ERD)

```
USERS
  ├── CUSTOMERS
  │   ├── VEHICLES
  │   │   └── ROTATION_REMINDERS
  │   └── INVOICES
  ├── SERVICES
  │   ├── SERVICE_ITEMS
  │   ├── SERVICE_PHOTOS
  │   └── TECHNICIAN_LOCATIONS
  ├── INVENTORY_ITEMS
  │   └── INVENTORY_TRANSACTIONS
  ├── SUPPLIERS
  ├── NOTIFICATION_PREFERENCES
  ├── SMS_MESSAGES
  ├── EMAIL_MESSAGES
  └── AUDIT_LOGS
```

---

## Table Definitions

### 1. USERS
User accounts for admin, manager, technician, receptionist, customer roles.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'technician', 'receptionist', 'customer')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Columns**:
- `id`: Unique identifier (UUID)
- `email`: Login email (unique)
- `password_hash`: Bcrypt hashed password
- `name`: Full name
- `role`: User role with constraints
- `is_active`: Account status
- `last_login`: Last login timestamp
- `phone`: Mobile number for SMS
- `avatar_url`: Profile picture URL
- `created_at`, `updated_at`, `deleted_at`: Audit timestamps

---

### 2. CUSTOMERS
Customer profiles with contact information.

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  loyalty_points INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  customer_since DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_user_id ON customers(user_id);
```

**Columns**:
- `id`: Customer ID (UUID)
- `user_id`: Link to user account (optional, for portal access)
- `name`, `phone`, `email`: Contact info
- `address`, `city`, `state`, `zip_code`: Location
- `loyalty_points`: Reward points balance
- `total_spent`: Lifetime purchase value
- `customer_since`: Customer acquisition date
- `notes`: Internal notes about customer

---

### 3. VEHICLES
Customer vehicles with VIN-based specifications.

```sql
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vin VARCHAR(17) UNIQUE NOT NULL,
  license_plate VARCHAR(20),
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),
  color VARCHAR(50),
  current_mileage INTEGER DEFAULT 0,
  oil_type VARCHAR(100),
  oil_capacity_quarts DECIMAL(5, 2),
  filter_part_number VARCHAR(100),
  filter_size VARCHAR(50),
  engine_type VARCHAR(100),
  engine_displacement VARCHAR(50),
  last_rotation_date DATE,
  last_rotation_mileage INTEGER,
  next_rotation_due_miles INTEGER,
  vin_lookup_cached_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
```

**Columns**:
- `id`: Vehicle ID (UUID)
- `customer_id`: Link to customer
- `vin`: 17-character VIN (unique)
- `license_plate`: License plate number
- `year`, `make`, `model`, `color`: Vehicle details
- `current_mileage`: Current odometer reading
- `oil_type`: Type of oil (Synthetic, Semi-Synthetic, Conventional)
- `oil_capacity_quarts`: Oil change quantity
- `filter_part_number`: OEM filter part number
- `filter_size`: Filter sizing info
- `last_rotation_date`, `last_rotation_mileage`: Last service details
- `next_rotation_due_miles`: Calculated next rotation milestone
- `vin_lookup_cached_at`: Cache timestamp for VIN data

---

### 4. INVENTORY_ITEMS
All parts, tires, oils, filters tracked.

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('tire', 'oil', 'filter', 'part', 'other')),
  sku VARCHAR(100) UNIQUE,
  part_number VARCHAR(100),
  description TEXT,
  current_quantity INTEGER DEFAULT 0,
  unit_cost DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  reorder_level INTEGER DEFAULT 10,
  reorder_quantity INTEGER DEFAULT 20,
  supplier_id UUID REFERENCES suppliers(id),
  specifications JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_inventory_items_category ON inventory_items(category);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_items_current_quantity ON inventory_items(current_quantity);
```

**Columns**:
- `id`: Item ID (UUID)
- `name`: Product name
- `category`: Item category (tire, oil, filter, part, other)
- `sku`, `part_number`: Item identifiers
- `description`: Product description
- `current_quantity`: Stock on hand
- `unit_cost`: Cost per unit
- `selling_price`: Retail price
- `reorder_level`: Threshold for low-stock alert
- `reorder_quantity`: Reorder batch size
- `supplier_id`: Link to supplier
- `specifications`: JSON field for extensibility (tire size, oil viscosity, etc.)

---

### 5. INVENTORY_TRANSACTIONS
Audit trail of all inventory movements.

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('received', 'sold', 'damaged', 'lost', 'returned', 'adjustment')),
  quantity_change INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  service_id UUID REFERENCES services(id) NULL
);

CREATE INDEX idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inventory_transactions_created_at ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
```

**Columns**:
- `id`: Transaction ID
- `inventory_item_id`: Item being adjusted
- `transaction_type`: Type of transaction
- `quantity_change`: Quantity added/removed
- `previous_quantity`, `new_quantity`: Before/after quantities
- `reason`: Reason code for adjustment
- `created_by`: User who recorded transaction
- `service_id`: Link to service if used in service

---

### 6. SUPPLIERS
Supplier information for inventory management.

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100),
  payment_terms VARCHAR(100),
  lead_time_days INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_is_active ON suppliers(is_active);
```

**Columns**:
- `id`: Supplier ID
- `name`: Supplier name
- `contact_person`, `email`, `phone`: Contact info
- `address`, `city`, `state`, `zip_code`, `country`: Location
- `payment_terms`: Terms (Net 30, etc.)
- `lead_time_days`: Expected delivery time
- `notes`: Internal notes
- `is_active`: Active status

---

### 7. SERVICES
All service records (oil changes, rotations, repairs, etc.).

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in-progress', 'completed', 'invoiced', 'cancelled')),
  technician_id UUID REFERENCES users(id),
  scheduled_date TIMESTAMP,
  start_time TIMESTAMP,
  completion_time TIMESTAMP,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_services_customer_id ON services(customer_id);
CREATE INDEX idx_services_vehicle_id ON services(vehicle_id);
CREATE INDEX idx_services_technician_id ON services(technician_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_created_at ON services(created_at);
```

**Columns**:
- `id`: Service ID (UUID)
- `service_number`: Human-readable number (SVC-2026-001)
- `customer_id`, `vehicle_id`: Links to customer and vehicle
- `service_type`: Type of service
- `status`: Service workflow status
- `technician_id`: Assigned technician
- `scheduled_date`: Appointment date
- `start_time`, `completion_time`: Service timestamps
- `estimated_cost`, `actual_cost`: Cost tracking
- `notes`: Technician notes

---

### 8. SERVICE_ITEMS
Line items for each service (inventory consumed).

```sql
CREATE TABLE service_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_used INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_items_service_id ON service_items(service_id);
CREATE INDEX idx_service_items_inventory_id ON service_items(inventory_item_id);
```

**Columns**:
- `id`: Line item ID
- `service_id`: Parent service
- `inventory_item_id`: Item used
- `quantity_used`: Quantity consumed
- `unit_price`: Price at time of service
- `line_total`: quantity × unit_price

---

### 9. SERVICE_PHOTOS
Before/after/during photos for each service.

```sql
CREATE TABLE service_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  photo_type VARCHAR(50) NOT NULL CHECK (photo_type IN ('before', 'during', 'after')),
  s3_bucket VARCHAR(255) NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  s3_url VARCHAR(1000) NOT NULL,
  file_size INTEGER,
  width INTEGER,
  height INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_service_photos_service_id ON service_photos(service_id);
CREATE INDEX idx_service_photos_photo_type ON service_photos(photo_type);
```

**Columns**:
- `id`: Photo ID
- `service_id`: Parent service
- `photo_type`: before, during, or after
- `s3_bucket`, `s3_key`, `s3_url`: AWS S3 location
- `file_size`, `width`, `height`: Image properties
- `latitude`, `longitude`: GPS coordinates (if available)
- `uploaded_by`: User who uploaded

---

### 10. INVOICES
Invoice records linked to services.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
  subtotal DECIMAL(12, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  paid_date DATE,
  payment_method VARCHAR(50),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
```

**Columns**:
- `id`: Invoice ID
- `invoice_number`: Sequential invoice number (INV-2026-001)
- `customer_id`, `service_id`: Links
- `status`: Invoice status workflow
- `subtotal`, `discount_amount`, `tax_amount`, `total`: Amounts
- `issued_date`, `due_date`, `paid_date`: Date tracking
- `payment_method`: How payment was received

---

### 11. INVOICE_ITEMS
Line items for invoices (may include labor, materials, taxes).

```sql
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,
  item_type VARCHAR(50) CHECK (item_type IN ('material', 'labor', 'service', 'discount', 'fee', 'tax')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
```

**Columns**:
- `id`: Item ID
- `invoice_id`: Parent invoice
- `description`: Item description
- `quantity`, `unit_price`, `line_total`: Amounts
- `item_type`: Category of item

---

### 12. TECHNICIAN_LOCATIONS
Real-time GPS tracking for mobile technicians.

```sql
CREATE TABLE technician_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(6, 2),
  altitude DECIMAL(8, 2),
  speed DECIMAL(6, 2),
  heading DECIMAL(6, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_technician_locations_technician_id ON technician_locations(technician_id);
CREATE INDEX idx_technician_locations_service_id ON technician_locations(service_id);
CREATE INDEX idx_technician_locations_created_at ON technician_locations(created_at);
```

**Columns**:
- `id`: Location record ID
- `technician_id`: Technician
- `service_id`: Current service
- `latitude`, `longitude`: GPS coordinates
- `accuracy`, `altitude`, `speed`, `heading`: GPS metadata
- `created_at`: Timestamp of location (updated every 30 seconds)

**Note**: Partition by date for performance; retain only 30 days of data.

---

### 13. ROTATION_REMINDERS
Track tire rotation loyalty program.

```sql
CREATE TABLE rotation_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  last_rotation_date DATE,
  last_rotation_mileage INTEGER,
  next_rotation_due_miles INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'due', 'deferred', 'completed')),
  reminder_sent_at TIMESTAMP,
  reminder_sent_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rotation_reminders_vehicle_id ON rotation_reminders(vehicle_id);
CREATE INDEX idx_rotation_reminders_customer_id ON rotation_reminders(customer_id);
CREATE INDEX idx_rotation_reminders_status ON rotation_reminders(status);
```

**Columns**:
- `id`: Record ID
- `vehicle_id`, `customer_id`: Links
- `last_rotation_date`, `last_rotation_mileage`: Previous rotation
- `next_rotation_due_miles`: Target mileage (every 5,000 miles)
- `status`: Tracking status
- `reminder_sent_at`: When reminder was sent
- `reminder_sent_count`: Count of reminders sent

---

### 14. NOTIFICATION_PREFERENCES
Customer communication preferences.

```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  rotation_reminders BOOLEAN DEFAULT TRUE,
  service_updates BOOLEAN DEFAULT TRUE,
  promotional_offers BOOLEAN DEFAULT FALSE,
  phone_number_verified BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_preferences_customer_id ON notification_preferences(customer_id);
```

**Columns**:
- `id`: Preference record ID
- `customer_id`: Link to customer
- `sms_enabled`, `email_enabled`: Channel preferences
- `rotation_reminders`, `service_updates`, `promotional_offers`: Notification type preferences
- `phone_number_verified`, `email_verified`: Verified status

---

### 15. SMS_MESSAGES
Audit log of all SMS messages sent.

```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone_number VARCHAR(20) NOT NULL,
  message_text TEXT NOT NULL,
  twilio_message_sid VARCHAR(100) UNIQUE,
  status VARCHAR(50) CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'undelivered')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_code VARCHAR(10),
  error_message TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sms_messages_customer_id ON sms_messages(customer_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at);
```

**Columns**:
- `id`: Message ID
- `customer_id`: Recipient customer
- `phone_number`: Recipient phone
- `message_text`: SMS content
- `twilio_message_sid`: Twilio message ID
- `status`: Delivery status
- `sent_at`, `delivered_at`: Timestamps
- `error_code`, `error_message`: Failure details
- `related_entity_type`, `related_entity_id`: What this message relates to (service, rotation, etc.)

---

### 16. EMAIL_MESSAGES
Audit log of all emails sent.

```sql
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(50) CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_message TEXT,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_messages_customer_id ON email_messages(customer_id);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_created_at ON email_messages(created_at);
```

---

### 17. AUDIT_LOGS
Complete audit trail of user actions for compliance.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

**Columns**:
- `id`: Log entry ID
- `user_id`: User performing action
- `action`: Action name (create, update, delete)
- `entity_type`, `entity_id`: What was affected
- `old_values`, `new_values`: Before/after state (JSONB)
- `ip_address`, `user_agent`: Request details
- `created_at`: When action occurred

---

### 18. VIN_CACHE
Cache VIN lookup results to reduce API calls.

```sql
CREATE TABLE vin_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin VARCHAR(17) UNIQUE NOT NULL,
  year INTEGER,
  make VARCHAR(100),
  model VARCHAR(100),
  engine_type VARCHAR(100),
  engine_displacement VARCHAR(50),
  oil_type VARCHAR(100),
  oil_capacity_quarts DECIMAL(5, 2),
  filter_part_number VARCHAR(100),
  filter_size VARCHAR(50),
  maintenance_schedule JSONB,
  api_response JSONB,
  cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
);

CREATE INDEX idx_vin_cache_vin ON vin_cache(vin);
CREATE INDEX idx_vin_cache_expires_at ON vin_cache(expires_at);
```

**Columns**:
- `id`: Cache record ID
- `vin`: VIN being cached
- `year`, `make`, `model`: Vehicle info
- `engine_type`, `engine_displacement`: Engine specs
- `oil_type`, `oil_capacity_quarts`: Oil specs
- `filter_part_number`, `filter_size`: Filter specs
- `maintenance_schedule`: JSONB of service schedule
- `api_response`: Full API response for debugging
- `cached_at`, `expires_at`: Cache timestamps (30-day TTL)

---

## Key Indexes for Performance

```sql
-- Service queries
CREATE INDEX idx_services_status_date ON services(status, created_at DESC);
CREATE INDEX idx_services_technician_date ON services(technician_id, created_at DESC);

-- Invoice queries
CREATE INDEX idx_invoices_customer_date ON invoices(customer_id, created_at DESC);
CREATE INDEX idx_invoices_status_date ON invoices(status, due_date);

-- Rotation tracking
CREATE INDEX idx_rotation_reminders_status_date ON rotation_reminders(status, updated_at DESC);

-- Financial queries
CREATE INDEX idx_services_cost_date ON services(actual_cost, created_at DESC);
CREATE INDEX idx_invoices_total_date ON invoices(total, created_at DESC);
```

---

## Data Relationships Summary

| Parent | Child | Type | On Delete |
|--------|-------|------|-----------|
| users | customers | 1:0..1 | CASCADE |
| customers | vehicles | 1:N | CASCADE |
| customers | services | 1:N | CASCADE |
| customers | invoices | 1:N | CASCADE |
| customers | rotation_reminders | 1:N | CASCADE |
| vehicles | services | 1:N | CASCADE |
| vehicles | rotation_reminders | 1:N | CASCADE |
| services | service_items | 1:N | CASCADE |
| services | service_photos | 1:N | CASCADE |
| services | invoices | 1:0..1 | SET NULL |
| inventory_items | service_items | 1:N | - |
| invoices | invoice_items | 1:N | CASCADE |
| users | audit_logs | 1:N | SET NULL |
| users | technician_locations | 1:N | CASCADE |

---

## Migrations Strategy

All tables should be created via database migrations:

```bash
npm run db:migrate -- --up
```

Migration files follow naming convention:
- `001_create_users.js`
- `002_create_customers.js`
- `003_create_vehicles.js`
- etc.

---

## Performance Tuning

1. **Connection Pooling**: Max 20 connections per pool
2. **Query Timeouts**: 30-second timeout for all queries
3. **Pagination**: Always use LIMIT/OFFSET for large result sets
4. **Caching**: Cache VIN lookups, customer data, inventory
5. **Partitioning**: Partition technician_locations and sms_messages by date
6. **Archiving**: Archive data older than 7 years to archive tables

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-30
