import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'analyzed_emails'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('account_id').notNullable().defaultTo('')
      table.string('email_id').notNullable().defaultTo('')
      table.text('subject').notNullable().defaultTo('')
      table.text('sender').notNullable().defaultTo('')
      table.text('body').notNullable().defaultTo('')
      table.integer('score').notNullable().defaultTo(0)
      table.text('reasoning').notNullable().defaultTo('')
      table.boolean('is_spam').notNullable().defaultTo(false)
      table.decimal('cost', 10, 4).notNullable().defaultTo(0)
      table.string('ai_provider').notNullable().defaultTo('')
      table.dateTime('analyzed_at').nullable()
      table.integer('user_validated').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
