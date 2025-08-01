<template>
    <div :class="getGameBoardClassName()">
        <div class="hide-tile-button-container">
          <div class="hide-tile-button" @click="$emit('toggleTileView')" data-test="hide-tiles-button" v-i18n>
            {{ tileView }} tiles
          </div>
        </div>
        <div class="board-outer-spaces" id="colony_spaces">
          <board-space :v-if="hasSpace(SpaceName.GANYMEDE_COLONY)" :space="getSpace(SpaceName.GANYMEDE_COLONY)" text="Ganymede Colony" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.PHOBOS_SPACE_HAVEN)" :space="getSpace(SpaceName.PHOBOS_SPACE_HAVEN)" text="Phobos Space Haven" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.STANFORD_TORUS)" :space="getSpace(SpaceName.STANFORD_TORUS)" text="Stanford Torus" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.LUNA_METROPOLIS)" :space="getSpace(SpaceName.LUNA_METROPOLIS)" text="Luna Metropolis" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.DAWN_CITY)" :space="getSpace(SpaceName.DAWN_CITY)" text="Dawn City" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.STRATOPOLIS)" :space="getSpace(SpaceName.STRATOPOLIS)" text="Stratopolis" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.MAXWELL_BASE)" :space="getSpace(SpaceName.MAXWELL_BASE)" text="Maxwell Base" :tileView="tileView"></board-space>
          <!-- <board-space :space="getSpace('74')" text="Martian Transhipment Station" :tileView="tileView"></board-space> -->
          <board-space :v-if="hasSpace(SpaceName.CERES_SPACEPORT)" :space="getSpace(SpaceName.CERES_SPACEPORT)" text="Ceres Spaceport" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.DYSON_SCREENS)" :space="getSpace(SpaceName.DYSON_SCREENS)" text="Dyson Screens" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.LUNAR_EMBASSY)" :space="getSpace(SpaceName.LUNAR_EMBASSY)" text="Lunar Embassy" :tileView="tileView"></board-space>
          <board-space :v-if="hasSpace(SpaceName.VENERA_BASE)" :space="getSpace(SpaceName.VENERA_BASE)" text="Venera Base" :tileView="tileView"></board-space>
        </div>

        <div class="global-numbers">
            <div class="global-numbers-temperature">
                <div :class="getScaleCSS(lvl)" v-for="(lvl, idx) in getValuesForParameter('temperature')" :key="idx">{{ lvl.strValue }}</div>
            </div>

            <div class="global-numbers-oxygen">
                <div :class="getScaleCSS(lvl)" v-for="(lvl, idx) in getValuesForParameter('oxygen')" :key="idx">{{ lvl.strValue }}</div>
            </div>

            <div class="global-numbers-venus" v-if="expansions.venus">
                <div :class="getScaleCSS(lvl)" v-for="(lvl, idx) in getValuesForParameter('venus')" :key="idx">{{ lvl.strValue }}</div>
            </div>

            <div class="global-numbers-oceans">
              <span v-if="oceans_count === constants.MAX_OCEAN_TILES">
                <img width="26" src="assets/misc/circle-checkmark.png" class="board-ocean-checkmark" :alt="$t('Completed!')">
              </span>
              <span v-else>
                {{oceans_count}}/{{constants.MAX_OCEAN_TILES}}
              </span>
            </div>

            <div v-if="expansions.ares && aresData !== undefined">
                <div v-if="aresData.hazardData.erosionOceanCount.available">
                    <div class="global-ares-erosions-icon"></div>
                    <div class="global-ares-erosions-val">{{aresData.hazardData.erosionOceanCount.threshold}}</div>
                </div>
                <div v-if="aresData.hazardData.removeDustStormsOceanCount.available">
                    <div class="global-ares-remove-dust-storms-icon"></div>
                    <div class="global-ares-remove-dust-storms-val">{{aresData.hazardData.removeDustStormsOceanCount.threshold}}</div>
                </div>
                <div v-if="aresData.hazardData.severeErosionTemperature.available">
                    <div class="global-ares-severe-erosions"
                    :class="'global-ares-severe-erosions-'+aresData.hazardData.severeErosionTemperature.threshold"></div>
                </div>
                <div v-if="aresData.hazardData.severeDustStormOxygen.available">
                    <div class="global-ares-severe-dust-storms"
                    :class="'global-ares-severe-dust-storms-'+aresData.hazardData.severeDustStormOxygen.threshold"></div>
                </div>
            </div>

            <div v-if="altVenusBoard" class="global-alt-venus">
              <div class="std-wild-resource p18"></div>
              <div class="std-wild-resource p20"></div>
              <div class="std-wild-resource p22"></div>
              <div class="std-wild-resource p24"></div>
              <div class="std-wild-resource p26"></div>
              <div class="std-wild-resource p28"></div>
              <div class="std-wild-resource p30"></div>
              <div class="wild-resource p30b"></div>
            </div>
        </div>

        <div class="board" id="main_board">
            <board-space
              v-for="curSpace in getAllSpacesOnMars()"
              :key="curSpace.id"
              :space="curSpace"
              :aresExtension="expansions.ares"
              :tileView="tileView"
              data-test="board-space"
            />

            <svg id="board_legend" height="550" width="630" class="board-legend">
              <g v-for="(key, idx) of LEGENDS[boardName]" :key="idx" :transform="`translate(${key.position[0]}, ${key.position[1]})`">
                <text class="board-caption">
                  <tspan y="0">{{key.text[0]}}</tspan>
                  <tspan :x="key.secondRowX || 0" y="1.1em">{{key.text[1]}}</tspan>
                </text>
                <template v-if="key.line !== undefined">
                  <line :x1="key.line.from[0]" :y1="key.line.from[1]" :x2="key.line.to[0]" :y2="key.line.to[1]" class="board-line"></line>
                  <circle :cx="key.line.to[0]" :cy="key.line.to[1]" r="2" class="board-caption board_caption--black"/>
                </template>
              </g>

              <template v-if="boardName === BoardName.THARSIS">
                  <g id="ascraeus_mons" transform="translate(95, 192)">
                      <text class="board-caption">
                          <tspan dy="15">Ascraeus</tspan>
                          <tspan x="12" dy="12">Mons</tspan>
                      </text>
                      <line x1="38" y1="20" x2="88" y2="26" class="board-line"></line>
                      <text x="86" y="29" class="board-caption board_caption--black">●</text>
                  </g>

                  <g id="pavonis_mons" transform="translate(90, 230)">
                      <text class="board-caption">
                          <tspan dy="15">Pavonis</tspan>
                          <tspan x="4" dy="12">Mons</tspan>
                      </text>
                      <line x1="35" y1="25" x2="72" y2="30" class="board-line" />
                      <text x="66" y="33" class="board-caption board_caption--black">●</text>
                  </g>

                  <g id="arsia_mons" transform="translate(77, 275)">
                      <text class="board-caption">
                          <tspan dy="15">Arsia</tspan>
                          <tspan x="-2" dy="12">Mons</tspan>
                      </text>
                      <line x1="25" y1="20" x2="49" y2="26" class="board-line" />
                      <text x="47" y="29" class="board-caption board_caption--black">●</text>
                  </g>

                  <g id="tharsis_tholus" transform="translate(85, 175)">
                      <text class="board-caption" dx="47">
                          <tspan dy="-7">Tharsis</tspan>
                          <tspan dy="12" x="48">Tholus</tspan>
                      </text>
                      <line y1="-3" x2="160" y2="2" class="board-line" x1="90"></line>
                      <text x="158" y="5" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>

                  <g id="noctis_city" transform="translate(85, 320)">
                      <text class="board-caption">
                          <tspan dy="15">Noctis</tspan>
                          <tspan x="7" dy="12">City</tspan>
                      </text>
                      <line x1="30" y1="20" x2="140" y2="-20" class="board-line"></line>
                      <text x="136" y="-18" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
              </template>

              <template v-if="boardName === BoardName.ELYSIUM">
                  <g id="elysium_mons" transform="translate(110, 190)">
                      <text class="board-caption">
                          <tspan dy="15">Elysium</tspan>
                          <tspan x="8" dy="12">Mons</tspan>
                      </text>
                  </g>

                  <g id="hecatus_tholus"  transform="translate(130, 150)">
                      <text class="board-caption">
                          <tspan dy="15">Hecatus</tspan>
                          <tspan x="3" dy="12">Tholus</tspan>
                      </text>
                  </g>

                  <g id="arsia_mons" transform="translate(545, 272)">
                      <text class="board-caption">
                          <tspan dy="15">Arsia</tspan>
                          <tspan x="0" dy="12">Mons</tspan>
                      </text>
                  </g>

                  <g id="olympus_mons" transform="translate(505, 190)">
                      <text class="board-caption">
                          <tspan x="-5" dy="15">Olympus</tspan>
                          <tspan x="4" dy="12">Mons</tspan>
                      </text>
                  </g>
                </template>

                <template v-if="boardName === BoardName.VASTITAS_BOREALIS_NOVUS">
                  <g id="hectates_tholius_vastitas_borealis_novus"  transform="translate(270, 70)">
                      <text class="board-caption">
                          <tspan dy="15">Hectates</tspan>
                          <tspan x="5" dy="12">Tholius</tspan>
                      </text>
                  </g>

                  <g id="elysium_mons_vastitas_borealis_novus" transform="translate(480, 145)">
                      <text class="board-caption">
                          <tspan x="-5" dy="15">Elysium</tspan>
                          <tspan x="4" dy="12">Mons</tspan>
                      </text>
                  </g>

                  <g id="alba_mons_vastitas_borealis_novus" transform="translate(105, 230)">
                      <text class="board-caption">
                          <tspan x="0" dy="15">Alba</tspan>
                          <tspan x="-1" dy="12">Mons</tspan>
                      </text>
                  </g>

                  <g id="viking_2_vastitas_borealis_novus" transform="translate(530, 235)">
                      <text class="board-caption">
                          <tspan x="-5" dy="15">Viking 2</tspan>
                      </text>
                  </g>

                  <g id="uranius_tholus_vastitas_borealis_novus" transform="translate(115, 370)">
                      <text class="board-caption">
                          <tspan x="0" dy="0">Uranius</tspan>
                          <tspan x="2" dy="12">Tholus</tspan>
                      </text>
                  </g>

                  <g id="viking_1_vastitas_borealis_novus" transform="translate(164, 445)">
                      <text class="board-caption">
                          <tspan x="-5" dy="15">Viking 1</tspan>
                      </text>
                  </g>
                </template>

                <template v-if="boardName === BoardName.ARABIA_TERRA">
                  <g id="tikhonarov" transform="translate(487, 185)">
                      <text class="board-caption">
                          <tspan>Tikhonarov</tspan>
                      </text>
                      <line x1="15" y1="5" x2="3" y2="20" class="board-line"></line>
                      <text x="1" y="22" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="ladon" transform="translate(286, 496)">
                      <text class="board-caption">
                          <tspan>Ladon</tspan>
                      </text>
                      <line x1="20" y1="-12" x2="17" y2="-70" class="board-line"></line>
                      <text x="14" y="-68" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="flaugergues" transform="translate(480, 405)">
                      <text class="board-caption">
                          <tspan>Flaugergues</tspan>
                      </text>
                      <line x1="0" y1="2" x2="-15" y2="10" class="board-line"></line>
                      <text x="-17" y="12" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="charybdis" transform="translate(455, 450)">
                      <text class="board-caption">
                          <tspan>Charybdis</tspan>
                      </text>
                      <line x1="0" y1="2" x2="-15" y2="10" class="board-line"></line>
                      <text x="-17" y="12" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                </template>

                <template v-if="boardName === BoardName.AMAZONIS">
                  <g id="albor_tholus" transform="translate(85, 175)">
                      <text class="board-caption" dx="47">
                          <tspan dy="-7">Albor</tspan>
                          <tspan dy="12" x="48">Tholus</tspan>
                      </text>
                      <line y1="-3" x2="160" y2="2" class="board-line" x1="90"></line>
                      <text x="158" y="5" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="anseris_mons" transform="translate(525, 330)">
                      <text class="board-caption">
                          <tspan>Anseris</tspan>
                          <tspan x="5" dy="12">Mons</tspan>
                      </text>
                      <line x1="6" y1="-4" x2="-90" y2="-27" class="board-line"></line>
                      <text x="-95" y="-25" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="pindus_mons" transform="translate(500, 370)">
                      <text class="board-caption">
                          <tspan>Pindus</tspan>
                          <tspan x="5" dy="12">Mons</tspan>
                      </text>
                      <line x1="6" y1="-4" x2="-90" y2="-27" class="board-line"></line>
                      <text x="-95" y="-25" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="ulysses_tholus" transform="translate(325, 496)">
                      <text class="board-caption">
                          <tspan>Ulysses</tspan>
                          <tspan x="10" dy="12">Tholus</tspan>
                      </text>
                      <line x1="20" y1="-1" x2="4" y2="-109" class="board-line"></line>
                      <text x="1" y="-107" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                </template>

                <template v-if="boardName === BoardName.VASTITAS_BOREALIS">
                  <g id="elysium_mons_vastitas_borealis"  transform="translate(410, 70)">
                      <text class="board-caption">
                          <tspan dy="15">Elysium</tspan>
                          <tspan x="5" dy="12">Mons</tspan>
                      </text>
                  </g>
                  <g id="alba_fossae"  transform="translate(350, 70)">
                      <line x1="20" y1="30" x2="41" y2="82" class="board-line"></line>
                      <text x="39" y="85" class="board-caption board_caption--black">&#x25cf;</text>
                      <text class="board-caption">
                          <tspan dy="15">Alba</tspan>
                          <tspan x="5" dy="12">Fossae</tspan>
                      </text>
                  </g>
                  <g id="ceranius_fossae" transform="translate(80, 230)">
                      <text class="board-caption">
                          <tspan dy="15">Ceranius</tspan>
                          <tspan x="9" dy="12">Fossae</tspan>
                      </text>
                      <line x1="35" y1="25" x2="72" y2="30" class="board-line" />
                      <text x="66" y="33" class="board-caption board_caption--black">●</text>
                  </g>
                  <g id="alba_mons" transform="translate(105, 200)">
                      <text class="board-caption">
                          <tspan dy="15">Alba</tspan>
                          <tspan x="9" dy="12">Mons</tspan>
                      </text>
                      <line x1="35" y1="25" x2="94" y2="31" class="board-line" />
                      <text x="92" y="34" class="board-caption board_caption--black">●</text>
                  </g>
                </template>

                <template v-if="boardName === BoardName.TERRA_CIMMERIA">
                  <g id="albor_tholus"  transform="translate(260, 70)">
                      <text class="board-caption">
                          <tspan dy="15">Albor</tspan>
                          <tspan x="5" dy="12">Tholus</tspan>
                      </text>
                      <line x1="38" y1="26" x2="63" y2="38" class="board-line"></line>
                      <text x="61" y="41" class="board-caption board_caption--black">●</text>
                  </g>
                  <g id="apollinaris_mons" transform="translate(500, 210)">
                      <text class="board-caption">
                          <tspan>Apollinaris</tspan>
                          <tspan x="10" dy="12">Mons</tspan>
                      </text>
                      <line x1="15" y1="5" x2="-35" y2="30" class="board-line"></line>
                      <text x="-40" y="33" class="board-caption board_caption--black">&#x25cf;</text>
                  </g>
                  <g id="hadriacus_mons" transform="translate(78, 320)">
                      <text class="board-caption">
                          <tspan dy="15">Hadriacus</tspan>
                          <tspan x="24" dy="12">Mons</tspan>
                      </text>
                  </g>
                  <g id="tyrrhenus_mons" transform="translate(80, 230)">
                      <text class="board-caption">
                          <tspan dy="15">Tyrrhenus</tspan>
                          <tspan x="9" dy="12">Mons</tspan>
                      </text>
                      <line x1="35" y1="25" x2="72" y2="30" class="board-line" />
                      <text x="66" y="33" class="board-caption board_caption--black">●</text>
                  </g>
                </template>
            </svg>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import * as constants from '@/common/constants';
import BoardSpace from '@/client/components/BoardSpace.vue';
import {AresData} from '@/common/ares/AresData';
import {SpaceModel} from '@/common/models/SpaceModel';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceId} from '@/common/Types';
import {TileView} from '@/client/components/board/TileView';
import {BoardName} from '@/common/boards/BoardName';
import {LEGENDS} from '@/client/components/Legends';
import {Expansion} from '@/common/cards/GameModule';
import {SpaceName} from '@/common/boards/SpaceName';

class GlobalParamLevel {
  constructor(public value: number, public isActive: boolean, public strValue: string) {
  }
}

export default Vue.extend({
  name: 'board',
  props: {
    spaces: {
      type: Array as () => Array<SpaceModel>,
    },
    venusScaleLevel: {
      type: Number,
    },
    altVenusBoard: {
      type: Boolean,
    },
    boardName: {
      type: String as () => BoardName,
    },
    oceans_count: {
      type: Number,
    },
    oxygen_level: {
      type: Number,
    },
    temperature: {
      type: Number,
    },
    expansions: {
      type: Object as () => Record<Expansion, boolean>,
    },
    aresData: {
      type: Object as () => AresData | undefined,
    },
    tileView: {
      type: String as () => TileView,
      default: 'show',
    },
  },
  components: {
    BoardSpace,
  },
  data() {
    return {
      constants,
      spaceMap: new Map<string, SpaceModel>(this.spaces.map((s) => [s.id, s])),
    };
  },
  methods: {
    getAllSpacesOnMars(): Array<SpaceModel> {
      const boardSpaces: Array<SpaceModel> = [...this.spaces];
      boardSpaces.sort(
        (space1: SpaceModel, space2: SpaceModel) => {
          return parseInt(space1.id) - parseInt(space2.id);
        },
      );
      return boardSpaces.filter((s: SpaceModel) => {
        return s.spaceType !== SpaceType.COLONY;
      });
    },
    hasSpace(spaceId: SpaceId): boolean {
      return this.spaceMap.has(spaceId);
    },
    getSpace(spaceId: SpaceId): SpaceModel {
      const space = this.spaceMap.get(spaceId);
      if (space === undefined) {
        // For some reason Vue still calls getSpace when hasSpace is false. I thought it didn't.
        // Returning undefined as SpaceModel satisfies the type checker, but the value isn't
        // used.
        return undefined as unknown as SpaceModel;
      }
      return space;
    },
    getValuesForParameter(targetParameter: string): Array<GlobalParamLevel> {
      const values = [];
      let startValue: number;
      let endValue: number;
      let step: number;
      let curValue: number;
      let strValue: string;

      switch (targetParameter) {
      case 'oxygen':
        startValue = constants.MIN_OXYGEN_LEVEL;
        endValue = constants.MAX_OXYGEN_LEVEL;
        step = 1;
        curValue = this.oxygen_level;
        break;
      case 'temperature':
        startValue = constants.MIN_TEMPERATURE;
        endValue = constants.MAX_TEMPERATURE;
        step = 2;
        curValue = this.temperature;
        break;
      case 'venus':
        startValue = constants.MIN_VENUS_SCALE;
        endValue = constants.MAX_VENUS_SCALE;
        step = 2;
        curValue = this.venusScaleLevel;
        break;
      default:
        throw new Error('Wrong parameter to get values from: ' + targetParameter);
      }

      for (let value = endValue; value >= startValue; value -= step) {
        strValue = (targetParameter === 'temperature' && value > 0) ? '+'+value : value.toString();
        values.push(
          new GlobalParamLevel(value, value === curValue, strValue),
        );
      }
      return values;
    },
    getScaleCSS(paramLevel: GlobalParamLevel): string {
      let css = 'global-numbers-value val-' + paramLevel.value + ' ';
      if (paramLevel.isActive) {
        css += 'val-is-active';
      }
      return css;
    },
    oceansValue() {
      const oceans_count = this.oceans_count || 0;
      const leftover = constants.MAX_OCEAN_TILES - oceans_count;
      if (leftover === 0) {
        return '<img width="26" src="assets/misc/circle-checkmark.png" class="board-ocean-checkmark" :alt="$t(\'Completed!\')">';
      } else {
        return `${oceans_count}/${constants.MAX_OCEAN_TILES}`;
      }
    },
    getGameBoardClassName(): string {
      return this.expansions.venus ? 'board-cont board-with-venus' : 'board-cont board-without-venus';
    },
  },
  computed: {
    BoardName(): typeof BoardName {
      return BoardName;
    },
    LEGENDS(): typeof LEGENDS {
      return LEGENDS;
    },
    SpaceName(): typeof SpaceName {
      return SpaceName;
    },
  },
});
</script>
