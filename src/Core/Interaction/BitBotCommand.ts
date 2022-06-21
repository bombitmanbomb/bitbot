import { Dictionary, List, Out } from '@bombitmanbomb/utils';
import { PermissionString } from 'discord.js';
import { Interaction, ApplicationCommandData, ApplicationCommandType } from 'discord.js';
import { ReplyHelper } from './ReplyHelper';

export class BitBotCommand {
  public permissions: Dictionary<string, List<PermissionString>> = new Dictionary;
  public permissionValidationScript!: (interaction: Interaction, cache: any) => IValidation;
  private permissionValidation: Dictionary<string, (com: Interaction) => any> = new Dictionary;
  private script!: (com: Interaction, reply: ReplyHelper, validation: IValidation & { pass: boolean }) => any;
  private subScripts: Dictionary<string, BitBotCommand["script"]> = new Dictionary;
  public command!: ApplicationCommandData;

  public get type(): ApplicationCommandType {
    return this.command.type as ApplicationCommandType;
  }

  constructor(command: IBitBotCommand) {
    this.setCommand(command.command)
    this.setScript(command.script);
    if (command.perms) { }
  }

  public setCommand(command: BitBotCommand["command"]): void {
    this.command = command;
  }
  public setScript(script: BitBotCommand["script"]): void {
    this.script = script;
  }
  public setSubScript(key: string, script: BitBotCommand["script"]): void {
    this.subScripts.AddOrUpdate(key, script, () => script);
  }
  public get commandId(): string {
    return this.command?.name
  }

  /**
   * Define the permissions for a given key
   *
   * @param key Channel_Tag
   * @param perms Permission String List
   */
  public setPermission(key: string, perm: PermissionString): void
  public setPermission(key: string, perms: PermissionString[]): void
  public setPermission(key: string, perms: List<PermissionString>): void
  public setPermission(key: string, perms: PermissionString | PermissionString[] | List<PermissionString>): void {
    if (typeof perms === 'string') this.permissions.AddOrUpdate(key, List.ToList([perms]), (_, list) => { list.Add(perms); return list });
    else this.permissions.AddOrUpdate(key, List.ToList(perms), (_, list) => { list.AddRange(List.ToList(perms)); return list });
  }

  public async runPermissionValidation(interaction: Interaction, cache: any): Promise<IValidation> {
    if (this.permissionValidationScript != null)
      return this.permissionValidationScript.call(this, interaction, cache)
    return { cache, channels: [] }
  }

  public async run(interaction: Interaction, helper: ReplyHelper, validation: any): Promise<void> {
    if (interaction.isCommand()) {
      let subCommand = interaction.options.getSubcommand(false)
      if (subCommand) {
        let script = new Out<BitBotCommand["script"]>()
        if (this.subScripts.TryGetValue(subCommand, script) && script.Out != null)
          return void script.Out.call(this, interaction, helper, validation);
      } else return void this.script.call(this, interaction, helper, validation);
    }
    helper.quickReply("Command not Handled", "Contact the Bot Owner");
  }

  /**
   * Define the Validation Behavior
   *
   * Return List of mapped channels for channel permission validation
   *
   * Response Validation Will be passed to script
   */
  public setPermissionCheck(valid: BitBotCommand["permissionValidationScript"]): void {
    this.permissionValidationScript = valid
  }


  //? Validation
  public get isValid(): boolean {
    return (this.script != null)
  }
}


export interface IValidation {
  cache: any,
  channels: {
    channel_token: string,
    channel_id: string
  }[]
}

export type IBitBotCommand = Command & (CommandPermission | CommandNoPermission)

type Command = {
  command: ApplicationCommandData,
  script: BitBotCommand["script"]
}

type CommandPermission = {
  perms: true
  permissions: {
    key: string,
    perms: PermissionString | PermissionString[]
  }[]
  permissionValidation: BitBotCommand["permissionValidationScript"]
}
type CommandNoPermission = {
  perms: false
  permissions: null | undefined
  permissionValidation: null | undefined
}
