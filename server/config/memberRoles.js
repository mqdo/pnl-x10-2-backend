function memberRoles(membersList) {
  let manager = 0;
  let leader = 0;
  let member = 0;
  let supervisor = 0;
  membersList?.forEach((m) => {
    switch (m.role) {
      case 'manager':
        manager++;
        break;
      case 'leader':
        leader++;
        break;
      case 'member':
        member++;
        break;
      case 'supervisor':
        supervisor++;
        break;
      default:
        break;
    }
  })
  return { manager, leader, member, supervisor };
}

module.exports = memberRoles;