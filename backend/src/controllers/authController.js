const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CustomTask = require('../models/CustomTask');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
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

    // Seed a sensible default daily-deed so the "عبادات يومية" section isn't empty.
    await CustomTask.create({
      user: user._id,
      group: 'dailyDeeds',
      title: 'صلاة الضحى',
      description: 'من 2 إلى 8 ركعات بعد شروق الشمس',
      icon: 'sun',
    });

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

async function me(req, res) {
  return res.json({ user: req.user.toPublicJSON() });
}

async function updateSettings(req, res) {
  try {
    const { name, city, calculationMethod, madhab, weights, notificationsEnabled } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (city !== undefined) user.city = city;
    if (calculationMethod !== undefined) user.calculationMethod = calculationMethod;
    if (madhab !== undefined) user.madhab = madhab;
    if (notificationsEnabled !== undefined) user.notificationsEnabled = notificationsEnabled;

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

module.exports = { register, login, me, updateSettings };
