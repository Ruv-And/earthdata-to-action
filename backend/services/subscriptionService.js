// src/services/subscription.service.js
import { pool } from '../config/database.js';
import bcrypt from 'bcrypt';

export class SubscriptionService {
  static async create(
    sessionToken,
    latitude,
    longitude,
    notificationsEnabled,
    pushSubscription = null
  ) {
    const tokenHash = await bcrypt.hash(sessionToken, 10);
    
    const result = await pool.query(
      `INSERT INTO subscriptions 
       (session_token_hash, latitude, longitude, notifications_enabled, push_subscription)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [tokenHash, latitude, longitude, notificationsEnabled, pushSubscription]
    );
    
    return result.rows[0];
  }

  static async getById(id) {
    const result = await pool.query(
      'SELECT * FROM subscriptions WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async findBySessionToken(sessionToken) {
    const result = await pool.query(
      'SELECT * FROM subscriptions'
    );
    
    // Compare with each hashed token
    for (const row of result.rows) {
      if (await bcrypt.compare(sessionToken, row.session_token_hash)) {
        return row;
      }
    }
    
    return null;
  }

  static async update(
    id,
    updates
  ) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.notificationsEnabled !== undefined) {
      fields.push(`notifications_enabled = $${paramCount++}`);
      values.push(updates.notificationsEnabled);
    }
    if (updates.latitude !== undefined) {
      fields.push(`latitude = $${paramCount++}`);
      values.push(updates.latitude);
    }
    if (updates.longitude !== undefined) {
      fields.push(`longitude = $${paramCount++}`);
      values.push(updates.longitude);
    }
    if (updates.pushSubscription !== undefined) {
      fields.push(`push_subscription = $${paramCount++}`);
      values.push(updates.pushSubscription);
    }

    values.push(id);

    await pool.query(
      `UPDATE subscriptions 
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}`,
      values
    );
  }

  static async delete(id) {
    await pool.query('DELETE FROM subscriptions WHERE id = $1', [id]);
  }

  static async getActiveSubscriptions() {
    const result = await pool.query(
      `SELECT id, latitude, longitude, last_notification_sent, push_subscription, notifications_enabled
       FROM subscriptions
       WHERE notifications_enabled = true`
    );
    
    return result.rows;
  }

  static async verifyToken(id, sessionToken) {
    const subscription = await this.getById(id);
    
    if (!subscription) {
      return false;
    }

    return await bcrypt.compare(sessionToken, subscription.session_token_hash);
  }

  static async updateLastNotification(id) {
    await pool.query(
      'UPDATE subscriptions SET last_notification_sent = NOW() WHERE id = $1',
      [id]
    );
  }
}
