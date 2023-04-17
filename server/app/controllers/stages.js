const StageSchema = require("../models/Stages");

exports.searchnameStage = async (req, res) => {
  const { name } = req.body;
  try {
    const stages = await StageSchema.find({ name });
    res.status(200).json(stages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addStage = async (req, res) => {
  const { name, startDate, endDateExpected, endDateActual, evaluations } = req.body;
  const stages = StageSchema({
    name,
    startDate,
    endDateExpected,
    endDateActual,
    evaluations,
  });
  try {
    if (
      !name ||
      !startDate ||
      !endDateExpected ||
      !endDateActual 
     
    ) {
      return res.status(400).json({ message: "All fields are required!" });
    }
    await stages.save()
    res.status(200).json(stages);
  } catch (err) {
    res.status(500).json({ message: err.message }); 
  }
};
