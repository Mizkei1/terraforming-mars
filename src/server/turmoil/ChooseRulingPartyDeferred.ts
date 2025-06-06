import {IPlayer} from '../IPlayer';
import {DeferredAction} from '../deferredActions/DeferredAction';
import {OrOptions} from '../inputs/OrOptions';
import {Turmoil} from './Turmoil';
import {PoliticalAgendas} from './PoliticalAgendas';
import {IParty} from './parties/IParty';
import {SelectOption} from '../inputs/SelectOption';

export class ChooseRulingPartyDeferred extends DeferredAction<IParty> {
  private turmoil: Turmoil;
  constructor(player: IPlayer, turmoil: Turmoil) {
    super(player);
    this.turmoil = turmoil;
  }

  public execute() {
    // Interesting that this doesn't use SelectParty. Perhaps that's the right choice.
    const setRulingParty = new OrOptions().setTitle('Select new ruling party');
    setRulingParty.options = this.turmoil.parties.map((p: IParty) => new SelectOption(p.name).andThen(() => {
      this.turmoil.rulingPolicy().onPolicyEnd?.(this.player.game);
      this.turmoil.rulingParty = p;
      PoliticalAgendas.setNextAgenda(this.turmoil, this.player.game);
      this.cb(p);
      return undefined;
    }));
    return setRulingParty;
  }
}
