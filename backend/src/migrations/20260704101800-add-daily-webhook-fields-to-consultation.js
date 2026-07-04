'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('consultations');

    if (!table.meetingStatus) {
      await queryInterface.addColumn('consultations', 'meetingStatus', {
        type: Sequelize.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'),
        defaultValue: 'NOT_STARTED',
      });
    }
    if (!table.firstJoinedAt) {
      await queryInterface.addColumn('consultations', 'firstJoinedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.lastLeftAt) {
      await queryInterface.addColumn('consultations', 'lastLeftAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!table.totalDurationSeconds) {
      await queryInterface.addColumn('consultations', 'totalDurationSeconds', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      });
    }
    if (!table.sessions) {
      await queryInterface.addColumn('consultations', 'sessions', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('consultations', 'sessions');
    await queryInterface.removeColumn('consultations', 'totalDurationSeconds');
    await queryInterface.removeColumn('consultations', 'lastLeftAt');
    await queryInterface.removeColumn('consultations', 'firstJoinedAt');
    await queryInterface.removeColumn('consultations', 'meetingStatus');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_consultations_meetingStatus";');
  },
};