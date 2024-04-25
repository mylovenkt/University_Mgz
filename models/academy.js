const mongoose = require('mongoose');
const moment = require('moment');

const academySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        requried: false,
    },
    startDate: {
        type: Date,
        required: true,
        timezone: '+07:00',
        get: (value) => moment.utc(value).format('YYYY-MM-DD'),
    },
    endDate: {
        type: Date,
        requried: true,
        timezone: '+07:00',
        get: (value) => moment.utc(value).format('YYYY-MM-DD'),
    },
});
// Thêm trường ảo 'status' dựa trên thời gian hiệu lực của endDate
academySchema.virtual('status').get(function() {
    const currentDate = moment.utc();
    if (currentDate.isBetween(this.startDate, this.endDate)) {
        return 'Active';
    } else {
        return 'Unactive';
    }
});

// Đảm bảo rằng trường ảo 'status' cũng được trả về khi gọi toJSON hoặc toObject
academySchema.set('toJSON', { virtuals: true });
academySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Academy', academySchema);