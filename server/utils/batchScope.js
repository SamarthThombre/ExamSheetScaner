// Returns a Mongoose filter object based on the user's role
const getBatchFilter = (user, extra = {}) => {
  const filter = { ...extra };
  if (user.role === 'teacher') filter.teacher = user._id;
  if (user.role === 'college_admin') filter.college = user.college;
  // super_admin: no filter
  return filter;
};

module.exports = { getBatchFilter };
