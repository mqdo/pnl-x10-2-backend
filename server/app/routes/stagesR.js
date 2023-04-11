const express = require('express');

const router = express.Router();


const {addStage} = require("../controllers/stages.js")

router.get("./addStage",addStage)

module.exports = router;