const express = require('express');

const router = express.Router();


const {addStage,searchnameStage} = require("../controllers/stages.js")


router.post("/search",searchnameStage)

router.post("/addstage",addStage)
router.post("/addstage",addStage)


module.exports = router;