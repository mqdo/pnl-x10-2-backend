const uploadImage = async (req, res) => {
  try {
    const url = req?.file?.path;
    if (!url) {
      return res.status(400).json({ message: 'Error uploading image' });
    }
    return res.status(201).json({ image: url, message: 'Image uploaded successfully' });
  } catch (err) {
    console.error(err);
    return res.status(400).json({ message: err.message || 'Bad request' });
  }
}

module.exports = {
  uploadImage
}