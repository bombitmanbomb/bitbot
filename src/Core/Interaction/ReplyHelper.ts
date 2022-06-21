import { Interaction, MessagePayload, WebhookEditMessageOptions, InteractionReplyOptions } from 'discord.js';
import { LogicManager } from '../Managers/LogicManager';
export class ReplyHelper {
  interaction: Interaction
  ephemeral: boolean = true
  manager:LogicManager
  acknowledged:boolean = false
  constructor(interaction: Interaction, ephemeral = true, manager:LogicManager) {
    this.interaction = interaction
    this.ephemeral = ephemeral
    this.manager = manager
  }
  async reply(options: string | MessagePayload | WebhookEditMessageOptions | InteractionReplyOptions) {
    if (this.interaction.isCommand()) {
      if (this.interaction.replied) {
        return this.interaction.followUp(options);
      } else {
        if (this.interaction.deferred || this.acknowledged) {
          return this.interaction.editReply(options)
        } else {
          return this.interaction.reply(options)
        }
      }
    } else if (this.interaction.isButton()) {
      //TODO Button Handle
    }
  }
  quickReply(title: string, description?: string, color?: number) {
    return this.reply({
      embeds: [
        {
          title, description, color, footer: { text: this.manager.Bot.Config.Name ?? "BitBot by Bitman#0669" }, timestamp: new Date()
        }
      ], ephemeral: true
    })
  }
}
