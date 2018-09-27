var c = {};

c.dbConnection = {
	host: '74.205.70.188',
	user: 'elitetechventor',
	password: 'jie1saeW',
	database: 'poker_techventors'
}; 

c.https = {
	privateKeyFilename: 'fake-keys/privatekey.pem',
	certFilename: 'fake-keys/certificate.pem'
};

c.rtc = {
	ip: 'zajelexpress.herokuapp.com',	//	no string 'localhost' there, only numeric values
	port: 9002
};

c.signals = {
	ip: 'zajelexpress.herokuapp.com',	//	no string 'localhost' there, only numeric values
	port: 9001
};

module.exports = c;