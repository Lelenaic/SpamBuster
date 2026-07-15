import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'general_settings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.integer('ai_sensitivity').notNullable().defaultTo(7)
      table.integer('email_age_days').notNullable().defaultTo(1)
      table.boolean('simplify_email_content').notNullable().defaultTo(true)
      table.string('simplify_email_content_mode').notNullable().defaultTo('aggressive')
      table.boolean('enable_cron').notNullable().defaultTo(true)
      table.string('cron_expression').notNullable().defaultTo('* * * * *')
      table.string('scheduler_mode').notNullable().defaultTo('simple')
      table.integer('scheduler_simple_value').notNullable().defaultTo(1)
      table.string('scheduler_simple_unit').notNullable().defaultTo('minutes')
      table.string('date_format').notNullable().defaultTo('iso')
      table.string('custom_date_format').notNullable().defaultTo('{YYYY}-{MM}-{DD}')
      table.string('time_format', 8).notNullable().defaultTo('24h')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
