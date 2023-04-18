const StageSchema = require("../models/Stages");


exports.searchnameStage = async (req, res) => {
  const name = req?.query?.name;
  let page = req?.query?.page || 1;
  let limit = req?.query?.limit || 10; // mặc định mỗi trang sẽ có 10 kết quả
  try {
    const count = await StageSchema.countDocuments({ name });
    const stages = await StageSchema.find({ name })
      .limit(limit)
      .skip(limit * (page - 1));
    res.status(200).json({
      stages: stages,
      total: count,
      currentPage: page,
      totalPages: Math.ceil(count / limit)
    });
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
