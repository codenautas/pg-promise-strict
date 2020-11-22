create user test_user password 'test_pass';
grant pg_read_server_files to test_user;
create database test_db owner test_user;
grant pg_read_server_files to test_user;
