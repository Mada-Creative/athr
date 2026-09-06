const express = require('express');
const requireAuth = require('../middleware/auth');
const { list, create, remove, getLogsByDate, toggleLog } = require('../controllers/taskController');

const router = express.Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);
router.get('/logs/:date', getLogsByDate);
router.patch('/logs/:date/:taskId', toggleLog);

module.exports = router;
