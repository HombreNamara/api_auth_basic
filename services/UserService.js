import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};

const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

const getAllUsers = async () => {
    const users = await db.User.findAll({
        where: {
            status: true
        }
    });
    return {
        code: 200,
        message: users
    };
};

const findUsers = async (req) => {
    const { name, eliminado, lastLoginBefore, lastLoginAfter } = req.query;
    let where = {};

    if (eliminado !== undefined) {
        where.status = eliminado === 'true' ? false : true;
    }
    if (name) {
        where.name = {
            [db.Sequelize.Op.like]: `%${name}%`
        };
    }
    if (lastLoginBefore) {
        where.updatedAt = {
            [db.Sequelize.Op.lt]: new Date(lastLoginBefore)
        };
    }
    if (lastLoginAfter) {
        if (where.updatedAt) {
            where.updatedAt[db.Sequelize.Op.gt] = new Date(lastLoginAfter);
        } else {
            where.updatedAt = {
                [db.Sequelize.Op.gt]: new Date(lastLoginAfter)
            };
        }
    }

    const users = await db.User.findAll({
        where: where
    });

    if (users.length ===0)
        return {
            code: 404,
            message: 'No se encontraron coincidencias'
        }

    return {
        code: 200,
        message: users
    };
};

const bulkCreate = async (req) => {
    const users = req.body.users;
    let exitosos = 0;
    let errores = 0;

    for (const user of users) {
        const { name, email, password, password_second, cellphone } = user;

        if (password !== password_second) {
            errores++;
            continue;
        }

        const existingUser = await db.User.findOne({
            where: {
                email: email
            }
        });

        if (existingUser) {
            errores++;
            continue;
        }

        const encryptedPassword = await bcrypt.hash(password, 10);

        try {
            await db.User.create({
                name,
                email,
                password: encryptedPassword,
                cellphone,
                status: true
            });
            exitosos++;
        } catch (error) {
            errores++;
        }
    }

    return {
        code: 200,
        message: `Se crearon exitosamente ${exitosos} usuarios, usuarios con errores: ${errores} .`,
    };
};


export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreate
}