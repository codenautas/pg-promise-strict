


DROP TABLE IF EXISTS perfect_nums;

CREATE TABLE perfect_nums(
    num bigint
);

INSERT INTO perfect_nums values (6), (28), (496), (8128);


SELECT count(*) FROM perfect_nums;