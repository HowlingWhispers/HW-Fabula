export const WORLD_PACKAGE = Object.freeze({
  schemaVersion: 1,
  id: 'bitterroot-demo',
  name: 'Bitterroot',
  description: 'Temporary local demo package used to exercise Fabula without tying the runtime to Bitterroot.',

  economy: {
    currencies: [
      { id: 'coin', name: 'Coin', symbol: '' }
    ]
  },

  rules: {
    skills: [
      { id: 'athletics', name: 'Athletics' },
      { id: 'stealth', name: 'Stealth' },
      { id: 'travel', name: 'Travel' }
    ],

    globalModifiers: [
      {
        when: 'actorStatAtLeast',
        stat: 'fatigue',
        value: 2,
        die: 'setback',
        count: 1,
        reason: 'fatigue'
      }
    ],

    consequenceDefaults: {
      actionMinutes: { success: 5, failure: 8 },
      threatMinutesPerPoint: 2,
      threatMinutesMax: 4,
      advantageMinutesPerPoint: 1,
      advantageMinutesMax: 3,
      fatigueFromThreat: 1,
      recoverFatigueAtAdvantage: 2,
      carryBoostOnFailureWithAdvantage: true,
      majorNegativeFatiguePerPoint: 1,
      majorPositiveNextCheckBoost: 1
    },

    intents: [
      {
        actionId: 'climb_muddy_bank',
        all: ['\\b(climb|scramble)\\b']
      },
      {
        actionId: 'move_quietly',
        all: ['\\b(sneak|creep|move quietly|slip past)\\b']
      },
      {
        actionId: 'push_on_trail',
        all: [
          '\\b(push on|keep going|continue|head out|walk|travel|follow the trail|take the trail)\\b',
          '\\b(trail|road|path|walk|travel|going|out)\\b'
        ]
      }
    ],

    actions: {
      climb_muddy_bank: {
        id: 'climb_muddy_bank',
        label: 'Climb muddy bank',
        skill: 'athletics',
        difficulty: 2,
        description: 'Climb a wet, difficult bank.',
        modifiers: [
          { when: 'inventoryTag', tag: 'climbing', die: 'boost', count: 1, reason: 'climbing equipment available' },
          { when: 'weatherIncludes', value: 'rain', die: 'setback', count: 1, reason: 'wet ground' }
        ],
        consequences: {
          threatDurability: { inventoryTag: 'climbing', baseLoss: 2, maxLoss: 8 }
        },
        preview: {
          success: 'You find enough purchase to make the climb.',
          failure: 'The wet ground gives under you before you can make the climb.'
        }
      },

      move_quietly: {
        id: 'move_quietly',
        label: 'Move quietly',
        skill: 'stealth',
        difficulty: 2,
        description: 'Attempt to move without drawing attention.',
        modifiers: [
          { when: 'visibilityEquals', value: 'poor', die: 'boost', count: 1, reason: 'poor visibility' }
        ],
        preview: {
          success: 'You move through the poor visibility without giving away more than the roll allows.',
          failure: 'Your attempt to move quietly does not hold.'
        }
      },

      push_on_trail: {
        id: 'push_on_trail',
        label: 'Push along rough trail',
        skill: 'travel',
        difficulty: 2,
        description: 'Continue along a difficult route.',
        consequences: {
          fatigueOnFailure: true
        },
        preview: {
          success: 'You make progress along the route.',
          failure: 'The attempt to push onward stalls.'
        }
      }
    }
  },

  initialState: {
    clock: {
      day: 12,
      minuteOfDay: 516
    },
    location: {
      id: 'hollowmere',
      name: 'Hollowmere',
      detail: 'market edge'
    },
    weather: {
      label: 'Light rain',
      visibility: 'poor'
    },
    actor: {
      id: 'eirvargr',
      name: 'Eirvargr',
      ageYearsAtStart: 17.365,
      health: { current: 10, max: 10 },
      fatigue: 2,
      balances: { coin: 14 },
      skills: {
        athletics: 2,
        stealth: 2,
        travel: 1
      },
      inventory: [
        { id: 'rope', name: 'Rope', quantity: 1, durability: 87, tags: ['climbing'] },
        { id: 'knife', name: 'Knife', quantity: 1, durability: 94, tags: ['tool'] },
        { id: 'bread', name: 'Bread', quantity: 2, durability: null, tags: ['food'] }
      ]
    },
    encounter: null,
    scene: {
      id: 'hollowmere-market-demo',
      transcript: [
        {
          id: 'scene-1',
          speaker: 'narrator',
          text: 'Light rain falls over Hollowmere at the market edge.'
        },
        {
          id: 'scene-2',
          speaker: 'Ragna Holt',
          text: '“You’re going out in that?”'
        }
      ]
    }
  }
});
