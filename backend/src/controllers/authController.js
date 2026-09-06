const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const User = require('../models/User');
const CustomTask = require('../models/CustomTask');

const googleClientIds = (process.env.GOOGLE_CLIENT_IDS || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const googleClient = new OAuth2Client();

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

async function seedDefaultDailyDeed(userId) {
  // Same starter checklist item new local accounts get, so a social
  // sign-up doesn't land on an empty "عبادات يومية" section either.
  await CustomTask.create({
    user: userId,
    group: 'dailyDeeds',
    title: 'صلاة الضحى',
    description: 'من 2 إلى 8 ركعات بعد شروق الشمس',
    icon: 'sun',
  });
}

// Shared by googleLogin/appleLogin: link the provider id to an existing
// account with the same email, or create a brand new one.
async function findOrCreateSocialUser({ provider, providerId, email, name }) {
  const idField = provider === 'google' ? 'googleId' : 'appleId';
  const normalizedEmail = email ? email.toLowerCase().trim() : null;

  let user = await User.findOne({ [idField]: providerId });
  if (user) return user;

  if (normalizedEmail) {
    user = await User.findOne({ email: normalizedEmail });
    if (user) {
      user[idField] = providerId;
      await user.save();
      return user;
    }
  }

  user = await User.create({
    name: name || 'مستخدم أثر',
    // Apple only shares a real email on a user's very first authorization;
    // this placeholder only ever applies if none arrives even then.
    email: normalizedEmail || `${provider}-${providerId}@athr.local`,
    authProvider: provider,
    [idField]: providerId,
  });

  await seedDefaultDailyDeed(user._id);
  return user;
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور يجب ألا تقل عن 6 أحرف' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    await seedDefaultDailyDeed(user._id);

    const token = signToken(user);
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'تعذر إنشاء الحساب' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'تعذر تسجيل الدخول' });
  }
}

async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'idToken مطلوب' });
    }
    if (googleClientIds.length === 0) {
      return res.status(500).json({ message: 'تسجيل الدخول عبر جوجل غير مُفعّل على الخادم بعد' });
    }

    const ticket = await googleClient.verifyIdToken({ idToken, audience: googleClientIds });
    const payload = ticket.getPayload();

    const user = await findOrCreateSocialUser({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'تعذر التحقق من حساب جوجل' });
  }
}

async function appleLogin(req, res) {
  try {
    const { identityToken, name } = req.body;
    if (!identityToken) {
      return res.status(400).json({ message: 'identityToken مطلوب' });
    }
    if (!process.env.APPLE_CLIENT_ID) {
      return res.status(500).json({ message: 'تسجيل الدخول عبر آبل غير مُفعّل على الخادم بعد' });
    }

    const payload = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    // Apple only ever sends the name in the client-side authorization
    // result (never inside the token), so the app passes it along here
    // on first sign-in only.
    const user = await findOrCreateSocialUser({
      provider: 'apple',
      providerId: payload.sub,
      email: payload.email,
      name,
    });

    const token = signToken(user);
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'تعذر التحقق من حساب آبل' });
  }
}

async function me(req, res) {
  return res.json({ user: req.user.toPublicJSON() });
}

const REMINDER_PRESETS = [null, 5, 10, 15, 30, 60];

async function updateSettings(req, res) {
  try {
    const { name, city, calculationMethod, madhab, weights, prayerNotifications } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (city !== undefined) user.city = city;
    if (calculationMethod !== undefined) user.calculationMethod = calculationMethod;
    if (madhab !== undefined) user.madhab = madhab;

    if (prayerNotifications !== undefined) {
      const merged = { ...user.prayerNotifications.toObject(), ...prayerNotifications };
      if (!REMINDER_PRESETS.includes(merged.reminderMinutes)) {
        return res.status(400).json({ message: 'قيمة التذكير قبل الصلاة غير صالحة' });
      }
      user.prayerNotifications = merged;
    }

    if (weights !== undefined) {
      const merged = { ...user.weights.toObject(), ...weights };
      const total = Object.values(merged).reduce((sum, v) => sum + Number(v || 0), 0);
      if (total !== 100) {
        return res.status(400).json({ message: 'مجموع النسب يجب أن يساوي 100%' });
      }
      user.weights = merged;
    }

    await user.save();
    return res.json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'تعذر تحديث الإعدادات' });
  }
}

module.exports = { register, login, googleLogin, appleLogin, me, updateSettings };
