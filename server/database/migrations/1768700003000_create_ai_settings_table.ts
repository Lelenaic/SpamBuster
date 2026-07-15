import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ai_settings'

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
      table.string('ai_source').notNullable().defaultTo('ollama')
      table.string('ollama_base_url').notNullable().defaultTo('http://localhost:11434')
      table.text('open_router_api_key').notNullable().defaultTo('')
      table.string('selected_model').notNullable().defaultTo('')
      table.string('selected_embed_model').notNullable().defaultTo('')
      table.boolean('enable_vector_db').notNullable().defaultTo(false)
      table.boolean('customize_spam_guidelines').notNullable().defaultTo(false)
      table.text('custom_spam_guidelines').notNullable().defaultTo('')
      table.decimal('temperature', 3, 2).notNullable().defaultTo(0.1)
      table.decimal('top_p', 3, 2).notNullable().defaultTo(0.9)

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
