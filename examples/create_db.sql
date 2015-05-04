create user test_user password 'test_pass';
create database test_db owner test_user;

create schema test;
alter schema test owner to test_user;

create table test.table1(
  id integer primary key,
  text1 text
);
  
insert into test.table1 values (1,'one'), (2,'two');
  
alter table test.table1 owner to test_user;
