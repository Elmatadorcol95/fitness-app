// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_complete_doctor_doom.sql';
import m0001 from './0001_vulcan_goals.sql';
import m0002 from './0002_progress_module.sql';
import m0003 from './0003_birth_date.sql';
import m0004 from './0004_gamification.sql';
import m0005 from './0005_training_module.sql';
import m0006 from './0006_rpe.sql';
import m0007 from './0007_progression.sql';
import m0008 from './0008_rest_prefs.sql';
import m0009 from './0009_muscle_exercise_usage.sql';
import m0010 from './0010_muscle_priorities.sql';
import m0011 from './0011_plan_days_cardio.sql';
import m0012 from './0012_exercise_preferences.sql';

  export default {
    journal,
    migrations: {
      m0000,
      m0001,
      m0002,
      m0003,
      m0004,
      m0005,
      m0006,
      m0007,
      m0008,
      m0009,
      m0010,
      m0011,
      m0012
    }
  }
