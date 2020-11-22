create user test_user password 'test_pass';
create database test_db owner test_user;

create schema test_pgps;
alter schema test_pgps owner to test_user;

grant pg_read_server_files to test_user;

create table test_pgps.table1(
  id integer primary key,
  text1 text
);
  
insert into test_pgps.table1 values (1,'one'), (2,'two');
  
alter table test_pgps.table1 owner to test_user;
