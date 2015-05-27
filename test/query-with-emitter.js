var _ = require('lodash');
var Events = require('events');

module.exports = function queryWithEmitter(rows,fields,finishWithThisError){
    var remianingRows = _.clone(rows);
    var emitter = new Events.EventEmitter();
    var endListener=false;
    var errorListener=false;
    var emitEnd=function(){};
    var result={
        rows:[],
        fields:fields,
        addRow:function addRow(row){
            this.rows.push(row);
        }
    }
    var emitRows=function(){
        remianingRows.forEach(function(row){
            emitter.emit('row',row,result);
        });
        remianingRows = [];
        if(finishWithThisError){
            setImmediate(emitter.emit('error',finishWithThisError));
        }else{
            setImmediate(emitEnd);
        }
    }
    emitter.on('newListener',function(name){
        switch(name){
        case 'row':
            return ;
        case 'end':
            emitEnd=function(){
                if(!remianingRows.length){
                    emitter.emit('end',result);
                }
            }
            return emitRows();
        case 'error':
            errorListener=true;
            return;
        default:
            throw new Error('queryWithEmitter: event not recognized');
        }
    });
    return emitter;
}
