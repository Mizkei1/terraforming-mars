import {expect} from 'chai';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {IGame} from '../../src/server/IGame';
import {cast, runAllActions} from '../TestingUtils';
import {Phase} from '../../src/common/Phase';
import {ExcavateSpacesDeferred} from '../../src/server/underworld/ExcavateSpacesDeferred';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';

describe('ExcavateSpacesDeferred', () => {
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(2, {underworldExpansion: true});
    game.phase = Phase.ACTION;
  });

  it('sanity', () => {
    game.defer(new ExcavateSpacesDeferred(player, 1));
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];

    expect(space.excavator).is.undefined;
    expect(selectSpace.cb(space)).is.undefined;

    runAllActions(game);

    expect(space.excavator).eq(player);
    cast(player.popWaitingFor(), undefined);
  });

  it('2 spaces', () => {
    game.defer(new ExcavateSpacesDeferred(player, 2));
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];

    expect(selectSpace.spaces).has.length(61);
    expect(space.excavator).is.undefined;

    cast(selectSpace.cb(space), undefined);

    expect(space.excavator).eq(player);

    runAllActions(game);
    const selectSpace2 = cast(player.popWaitingFor(), SelectSpace);
    const space2 = selectSpace2.spaces[0];

    expect(selectSpace2.spaces).does.not.contain(space);
    expect(selectSpace2.spaces).does.contain(space2); // This line just supports the line above.
    expect(selectSpace2.spaces).has.length(3);

    expect(space2.excavator).is.undefined;
    expect(selectSpace2.cb(space2)).is.undefined;

    runAllActions(game);

    expect(space2.excavator).eq(player);
    cast(player.popWaitingFor(), undefined);
  });
});
