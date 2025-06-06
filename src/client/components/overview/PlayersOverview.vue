<template>
        <div class="players-overview" v-if="hasPlayers()">
            <overview-settings />
            <div class="other_player" v-if="thisPlayer === undefined || players.length > 1">
                <div v-for="(otherPlayer, index) in getPlayersInOrder()" :key="otherPlayer.color">
                    <other-player v-if="thisPlayer === undefined || otherPlayer.color !== thisPlayer.color" :player="otherPlayer" :playerIndex="index"/>
                </div>
            </div>
            <player-info v-for="(p, index) in getPlayersInOrder()"
              :player="p"
              :key="p.color"
              :playerView="playerView"
              :firstForGen="getIsFirstForGen(p)"
              :actionLabel="getActionLabel(p)"
              :playerIndex="index"/>
            <div v-if="playerView.players.length > 1 && thisPlayer !== undefined" class="player-divider" />
            <player-info
              v-if="thisPlayer !== undefined"
              :player="thisPlayer"
              :key="thisPlayer.color"
              :playerView="playerView"
              :firstForGen="getIsFirstForGen(thisPlayer)"
              :actionLabel="getActionLabel(thisPlayer)"
              :playerIndex="-1"/>
        </div>
        
</template>

<script lang="ts">
import Vue from 'vue';
import PlayerInfo from '@/client/components/overview/PlayerInfo.vue';
import OverviewSettings from '@/client/components/overview/OverviewSettings.vue';
import OtherPlayer from '@/client/components/OtherPlayer.vue';
import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {ActionLabel} from '@/client/components/overview/ActionLabel';
import {Phase} from '@/common/Phase';
import {Color} from '@/common/Color';

const SHOW_NEXT_LABEL_MIN = 2;

export const playerIndex = (
  color: Color,
  players: Array<PublicPlayerModel>,
): number => {
  for (let idx = 0; idx < players.length; idx++) {
    if (players[idx].color === color) {
      return idx;
    }
  }
  return -1;
};

export default Vue.extend({
  name: 'PlayersOverview',
  props: {
    playerView: {
      type: Object as () => ViewModel,
    },
  },
  computed: {
    players(): Array<PublicPlayerModel> {
      return this.playerView.players;
    },
    thisPlayer(): PublicPlayerModel | undefined {
      return this.playerView.thisPlayer;
    },
  },
  components: {
    'player-info': PlayerInfo,
    'overview-settings': OverviewSettings,
    'other-player': OtherPlayer,
  },
  data() {
    return {};
  },
  methods: {
    hasPlayers(): boolean {
      return this.players.length > 0;
    },
    getIsFirstForGen(player: PublicPlayerModel): boolean {
      return playerIndex(player.color, this.players) === 0;
    },
    getPlayersInOrder(): Array<PublicPlayerModel> {
      const players = this.players;
      if (this.thisPlayer === undefined) {
        return players;
      }

      let result = [];
      let currentPlayerOffset = 0;
      const currentPlayerIndex = playerIndex(
        this.thisPlayer.color,
        this.players,
      );

      // shift the array by putting the player on focus at the tail
      currentPlayerOffset = currentPlayerIndex + 1;
      result = players
        .slice(currentPlayerOffset)
        .concat(players.slice(0, currentPlayerOffset));
      // return all but the focused user
      return result.slice(0, -1);
    },
    getActionLabel(player: PublicPlayerModel): ActionLabel {
      if (this.playerView.game.phase === Phase.DRAFTING) {
        if (player.needsToDraft) {
          return 'drafting';
        } else {
          return 'none';
        }
      } else if (this.playerView.game.phase === Phase.RESEARCH) {
        if (player.needsToResearch) {
          return 'researching';
        } else {
          return 'none';
        }
      }
      if (this.playerView.game.passedPlayers.includes(player.color)) {
        return 'passed';
      }
      if (player.isActive) return 'active';
      const notPassedPlayers = this.players.filter(
        (p: PublicPlayerModel) => !this.playerView.game.passedPlayers.includes(p.color),
      );

      const currentPlayerIndex = playerIndex(
        player.color,
        notPassedPlayers,
      );

      if (currentPlayerIndex === -1) {
        return 'none';
      }

      const prevPlayerIndex =
                currentPlayerIndex === 0 ?
                  notPassedPlayers.length - 1 :
                  currentPlayerIndex - 1;
      const isNext = notPassedPlayers[prevPlayerIndex].isActive;

      if (isNext && this.players.length > SHOW_NEXT_LABEL_MIN) {
        return 'next';
      }

      return 'none';
    },
  },
});
</script>
