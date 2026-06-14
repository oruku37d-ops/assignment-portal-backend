const scoreToGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

const gradeToScoreRange = (grade) => {
  const map = { A: '90-100', B: '80-89', C: '70-79', D: '60-69', F: '0-59' };
  return map[grade] || 'N/A';
};

module.exports = { scoreToGrade, gradeToScoreRange };
