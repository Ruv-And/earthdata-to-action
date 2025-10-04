export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error('Error:', err);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
