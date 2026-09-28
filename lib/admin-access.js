const OWNER_EMAIL = "1mmx1mmxxx@gmail.com";

function isAdminUser(user) {
  if (!user?.verifiedAt) return false;
  const email = String(user.email || "").trim().toLowerCase();
  if (!email) return false;
  const additionalEmails = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase());
  return email === OWNER_EMAIL || additionalEmails.includes(email);
}

module.exports = { isAdminUser };
